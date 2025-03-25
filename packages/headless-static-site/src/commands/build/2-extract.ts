import { join } from "node:path";
import PQueue from "p-queue";
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
    files,
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

  const startTime = Date.now();
  const requestCache = createStoreRequestCache("_extract", requestCacheDir);
  const extractionConfigs: Record<string, any> = {};
  const stats: Record<string, number> = {};
  for (const extraction of allExtractions) {
    if (extraction.configure) {
      const extractionConfig = config.config?.[extraction.id];
      extractionConfigs[extraction.id] = await extraction.configure(
        { config, build: buildConfig, fileHandler: files },
        extractionConfig
      );
    } else {
      extractionConfigs[extraction.id] = config.config?.[extraction.id];
    }
    stats[extraction.id] = 0;
  }

  // Caches.
  const savingFiles: Promise<any>[] = [];
  const temp: Record<string, Record<string, any>> = {};

  let totalResources = allResources.length;
  for (const resource of allResources) {
    totalResources += resource.subResources || 0;
  }

  // Found Collections
  const collections: Record<string, string[]> = {};

  const progress = makeProgressBar("Extraction", totalResources, options.ui);

  const queue = new PQueue();

  for (const manifest of allResources) {
    queue.add(async () => {
      const skipSteps = config.stores[manifest.storeId]?.skip || [];
      const runSteps = config.stores[manifest.storeId]?.run;

      const cachedResource = createCacheResource({
        resource: manifest,
        temp,
        resourcePath: join(cacheDir, manifest.slug),
        collections,
        fileHandler: files,
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
          // log(`Skipping ${extraction.id} for ${manifest.slug}`);
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
              fileHandler: files,
            },
            extractConfig
          ));
        if (valid) {
          log(`Running extract: ${extraction.name} for ${manifest.slug}`);
          const startExtract = Date.now();
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
          stats[extraction.id] = (stats[extraction.id] || 0) + Date.now() - startExtract;

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
            fileHandler: files,
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
                  fileHandler: files,
                },
                extractConfig
              ));
            if (!valid) {
              continue;
            }
            const startExtract = Date.now();
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
            stats[canvasExtraction.id] = (stats[canvasExtraction.id] || 0) + Date.now() - startExtract;

            canvasCache.handleResponse(result, canvasExtraction);
          }

          savingFiles.push(canvasCache.save());

          progress.increment();
          canvasIndex++;
        }

        for (const canvasExtraction of canvasExtractions) {
          if (
            canvasExtraction.collectManifest &&
            temp[canvasExtraction.id] &&
            temp[canvasExtraction.id][manifest.slug]
          ) {
            const extractionConfig = extractionConfigs[canvasExtraction.id] || {};
            const startExtract = Date.now();
            await canvasExtraction.collectManifest(
              manifest,
              temp[canvasExtraction.id][manifest.slug],
              { config, build: buildConfig, fileHandler: files },
              extractionConfig
            );
            stats[canvasExtraction.id] = (stats[canvasExtraction.id] || 0) + Date.now() - startExtract;
          }
        }
      } else {
        progress.increment(manifest.subResources || 0);
      }
    });
  }

  await queue.onIdle();
  log(`Saving ${savingFiles.length} files`);
  await Promise.all(savingFiles);

  for (const extraction of allExtractions) {
    if (extraction.close) {
      const extractionConfig = extractionConfigs[extraction.id] || {};
      await extraction.close(extractionConfig);
    }
    if (extraction.collect && temp[extraction.id]) {
      const extractionConfig = extractionConfigs[extraction.id] || {};
      const resp = await extraction.collect(
        temp[extraction.id],
        { config, build: buildConfig, fileHandler: files },
        extractionConfig
      );
      if (extraction.injectManifest && resp && resp.temp) {
        const inject = extraction.injectManifest;
        for (const manifestSlug of Object.keys(resp.temp)) {
          queue.add(async () => {
            const extractionConfig = extractionConfigs[extraction.id] || {};
            const foundManifest = allResources.find((r) => r.slug === manifestSlug);
            if (!foundManifest) {
              return;
            }
            const manifestCache = createCacheResource({
              resource: foundManifest,
              temp,
              resourcePath: join(cacheDir, manifestSlug),
              collections,
              fileHandler: files,
            });
            const startExtract = Date.now();
            const manifestInjected = await inject(
              foundManifest,
              resp.temp[manifestSlug],
              { config, build: buildConfig, fileHandler: files },
              extractionConfig
            );
            stats[extraction.id] = (stats[extraction.id] || 0) + Date.now() - startExtract;
            manifestCache.handleResponse(manifestInjected, extraction);
            await manifestCache.save();
          });
        }
      }
    }
  }

  progress.stop();

  stats._total = Date.now() - startTime;

  return { collections, stats };
}
