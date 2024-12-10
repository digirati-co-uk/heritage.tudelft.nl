import { join } from "node:path";
import { createCacheResource } from "../../util/cached-resource.ts";
import { makeProgressBar } from "../../util/make-progress-bar.ts";
import { createStoreRequestCache } from "../../util/store-request-cache.ts";
import type { ActiveResourceJson } from "../../util/store.ts";
import type { BuildConfig } from "../build.ts";

export async function extract(
  {
    allResources,
  }: {
    allResources: Array<ActiveResourceJson>;
  },
  buildConfig: BuildConfig
) {
  const {
    options,
    config,
    cacheDir,
    log,
    extractions,
    manifestExtractions,
    collectionExtractions,
    canvasExtractions,
    allExtractions,
    requestCacheDir,
  } = buildConfig;
  if (!options.extract) {
    // This is to remind us that we _cant_ export a site map without extracting.
    return {};
  }

  const requestCache = createStoreRequestCache("_extract", requestCacheDir);

  const extractionConfigs: Record<string, any> = {};
  for (const extraction of allExtractions) {
    if (extraction.configure) {
      const extractionConfig = config.config?.[extraction.id];
      extractionConfigs[extraction.id] = await extraction.configure({ config, build: buildConfig }, extractionConfig);
    } else {
      extractionConfigs[extraction.id] = config.config?.[extraction.id];
    }
  }

  // Caches.
  const savingFiles = [];
  const temp: Record<string, Record<string, any>> = {};

  let totalResources = allResources.length;
  for (const resource of allResources) {
    totalResources += resource.subResources || 0;
  }

  // Found Collections
  const collections: Record<string, string[]> = {};

  const progress = makeProgressBar("Extraction", totalResources);

  for (const manifest of allResources) {
    const skipSteps = config.stores[manifest.storeId]?.skip || [];
    const runSteps = config.stores[manifest.storeId]?.run;

    const cachedResource = createCacheResource({
      resource: manifest,
      temp,
      resourcePath: join(cacheDir, manifest.slug),
      collections,
    });

    const resource = await cachedResource.attachVault();

    let extractions = manifest.type === "Manifest" ? manifestExtractions : collectionExtractions;

    // Add extra steps that might not be in already.
    if (runSteps) {
      // Need to make a copy in this case.
      extractions = [...extractions];
      for (const step of runSteps) {
        const found = allExtractions.find((e) => e.id === step);
        if (found?.types.includes(manifest.type) && !extractions.includes(found)) {
          extractions.push(found);
        }
      }
    }

    for (const extraction of extractions) {
      if (skipSteps.includes(extraction.id)) {
        // log("Skipping " + extraction.id + " for " + manifest.slug);
        continue;
      }
      const storeConfig = extractionConfigs[extraction.id] || {};
      const extractConfig = Object.assign(
        {},
        storeConfig,
        config.stores[manifest.storeId].config?.[extraction.id] || {}
      );
      const valid =
        !options.cache ||
        (await extraction.invalidate(
          manifest,
          {
            caches: cachedResource.caches,
            resource,
            build: buildConfig,
          },
          extractConfig
        ));
      if (valid) {
        log(`Running extract: ${extraction.name} for ${manifest.slug}`);
        const result = await extraction.handler(
          manifest,
          {
            resource,
            meta: cachedResource.meta,
            indices: cachedResource.indices,
            caches: cachedResource.caches,
            config,
            build: buildConfig,
            requestCache,
          },
          extractConfig
        );

        cachedResource.handleResponse(result, extraction);
      }

      savingFiles.push(cachedResource.save());
    }

    progress.increment();

    // Canvas extractions.
    if (manifest.type === "Manifest" && canvasExtractions.length) {
      // Canvas extractions
      // These will have to be saved alongside the manifest in the same folder. We could do:
      //  - manifest.json
      //  - canvases/0/meta.json
      //  - canvases/0/caches.json
      //  - canvases/0/indices.json
      //  - canvases/0/files/thumbnail.jpg
      //
      // Which would be translated to:
      // - manifest.json
      // - canvases/0/meta.json
      // - canvases/0/thumbnail.jpg
      const canvases = resource.items || [];
      let canvasIndex = 0;
      for (const canvas of canvases) {
        const canvasCache = createCacheResource({
          resource: canvas,
          temp,
          resourcePath: join(cacheDir, manifest.slug, "canvases", canvasIndex.toString()),
          collections,
          parentManifest: manifest,
          canvasIndex,
        });

        const canvasResource = canvasCache.getCanvasResource();

        for (const canvasExtraction of canvasExtractions) {
          const storeConfig = extractionConfigs[canvasExtraction.id] || {};
          const extractConfig = Object.assign(
            {},
            storeConfig,
            config.stores[manifest.storeId].config?.[canvasExtraction.id] || {}
          );
          const valid =
            !options.cache ||
            (await canvasExtraction.invalidate(
              canvasResource,
              {
                caches: canvasCache.caches,
                resource: canvas,
                build: buildConfig,
              },
              extractConfig
            ));
          if (!valid) {
            continue;
          }
          const result = await canvasExtraction.handler(
            canvasResource,
            {
              resource: canvas,
              meta: canvasCache.meta,
              indices: canvasCache.indices,
              caches: canvasCache.caches,
              config,
              build: buildConfig,
              requestCache,
            },
            extractConfig
          );

          canvasCache.handleResponse(result, canvasExtraction);
        }

        savingFiles.push(canvasCache.save());

        progress.increment();
        canvasIndex++;
      }

      for (const canvasExtraction of canvasExtractions) {
        if (canvasExtraction.collectManifest && temp[canvasExtraction.id] && temp[canvasExtraction.id][manifest.slug]) {
          const extractionConfig = extractionConfigs[canvasExtraction.id] || {};
          await canvasExtraction.collectManifest(
            manifest,
            temp[canvasExtraction.id][manifest.slug],
            { config, build: buildConfig },
            extractionConfig
          );
        }
      }
    } else {
      progress.increment(manifest.subResources || 0);
    }
  }

  log(`Saving ${savingFiles.length} files`);
  await Promise.all(savingFiles);

  for (const extraction of allExtractions) {
    if (extraction.close) {
      const extractionConfig = extractionConfigs[extraction.id] || {};
      await extraction.close(extractionConfig);
    }
    if (extraction.collect && temp[extraction.id]) {
      const extractionConfig = extractionConfigs[extraction.id] || {};
      const resp = await extraction.collect(temp[extraction.id], { config, build: buildConfig }, extractionConfig);
      if (extraction.injectManifest && resp && resp.temp) {
        for (const manifestSlug of Object.keys(resp.temp)) {
          const extractionConfig = extractionConfigs[extraction.id] || {};
          const foundManifest = allResources.find((r) => r.slug === manifestSlug);
          if (!foundManifest) {
            continue;
          }
          const manifestCache = createCacheResource({
            resource: foundManifest,
            temp,
            resourcePath: join(cacheDir, manifestSlug),
            collections,
          });
          const manifestInjected = await extraction.injectManifest(
            foundManifest,
            resp.temp[manifestSlug],
            { config, build: buildConfig },
            extractionConfig
          );
          manifestCache.handleResponse(manifestInjected, extraction);
          await manifestCache.save();
        }
      }
    }
  }

  progress.stop();

  return { collections };
}
