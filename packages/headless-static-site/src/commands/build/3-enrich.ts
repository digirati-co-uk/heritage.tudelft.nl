import { join } from "node:path";
import { createCacheResource } from "../../util/cached-resource.ts";
import type { Enrichment } from "../../util/enrich.ts";
import { makeProgressBar } from "../../util/make-progress-bar.ts";
import { createStoreRequestCache } from "../../util/store-request-cache.ts";
import type { ActiveResourceJson } from "../../util/store.ts";
import type { BuildConfig } from "../build.ts";

export async function enrich({ allResources }: { allResources: Array<ActiveResourceJson> }, buildConfig: BuildConfig) {
  const {
    options,
    config,
    log,
    cacheDir,
    canvasEnrichment,
    manifestEnrichment,
    collectionEnrichment,
    allEnrichments,
    requestCacheDir,
  } = buildConfig;

  if (!options.enrich) {
    return {};
  }

  const enrichmentConfigs: Record<string, any> = {};
  const temp: Record<string, Record<string, any>> = {};
  for (const enrichment of allEnrichments) {
    if (enrichment.configure) {
      const enrichmentConfig = config.config?.[enrichment.id];
      enrichmentConfigs[enrichment.id] = await enrichment.configure({ config, build: buildConfig }, enrichmentConfig);
    } else {
      enrichmentConfigs[enrichment.id] = config.config?.[enrichment.id];
    }
  }

  let savingFiles: Promise<any>[] = [];
  let totalResources = allResources.length;
  for (const resource of allResources) {
    totalResources += resource.subResources || 0;
  }

  const progress = makeProgressBar("Enrichment", totalResources);
  const requestCache = createStoreRequestCache("_enrich", requestCacheDir);

  const processManifest = async (manifest: ActiveResourceJson) => {
    if (!manifest.vault) {
      progress.increment(1 + (manifest.subResources || 0));
      return;
    }
    const skipSteps = config.stores[manifest.storeId]?.skip || [];
    const runSteps = config.stores[manifest.storeId]?.run;

    const cachedResource = createCacheResource({
      resource: manifest,
      resourcePath: join(cacheDir, manifest.slug),
      temp,
      collections: {},
    });

    const resource = await cachedResource.attachVault();
    const builder = await cachedResource.getVaultBuilder();

    let enrichmentList = manifest.type === "Manifest" ? manifestEnrichment : collectionEnrichment;

    // Add extra steps that might not be in already.
    if (runSteps) {
      // Need to make a copy in this case.
      enrichmentList = [...enrichmentList];
      for (const step of runSteps) {
        const found = allEnrichments.find((e) => e.id === step);
        if (found?.types.includes(manifest.type) && !enrichmentList.includes(found)) {
          enrichmentList.push(found);
        }
      }

      // order by enrichment list.
      enrichmentList = enrichmentList.sort((a: any, b: any) => {
        const aIndex = runSteps.indexOf(a.id);
        const bIndex = runSteps.indexOf(b.id);
        if (aIndex === -1 && bIndex === -1) {
          return 0;
        }
        if (aIndex === -1) {
          return 1;
        }
        if (bIndex === -1) {
          return -1;
        }
        return aIndex - bIndex;
      });
    }

    const runEnrichment = async (enrichment: Enrichment) => {
      const filesDir = join(cacheDir, manifest.slug, "files");
      const storeConfig = enrichmentConfigs[enrichment.id] || {};
      const enrichmentConfig = Object.assign(
        {},
        storeConfig,
        config.stores[manifest.storeId].config?.[enrichment.id] || {}
      );

      const valid =
        !options.cache ||
        (await enrichment.invalidate(
          manifest,
          {
            caches: cachedResource.caches,
            resource,
            config,
            files: filesDir,
          },
          enrichmentConfig
        ));
      if (!valid) {
        // console.log('Skipping "' + enrichment.name + '" for "' + manifest.slug + '" because it is not modified');
        return;
      }

      const result = await enrichment.handler(
        manifest,
        {
          meta: cachedResource.meta,
          indices: cachedResource.indices,
          caches: cachedResource.caches,
          config,
          builder,
          resource,
          files: filesDir,
          requestCache,
        },
        enrichmentConfig
      );

      cachedResource.handleResponse(result, enrichment);
    };

    const processedEnrichments = [];
    for (const enrichment of enrichmentList) {
      if (skipSteps.includes(enrichment.id)) {
        continue;
      }
      processedEnrichments.push(runEnrichment(enrichment));
    }

    const results = await Promise.allSettled(processedEnrichments);
    const errors = results.filter((r) => r.status === "rejected");
    if (errors.length > 0) {
      throw new Error(
        `Enrichment failed for ${errors.length} manifest(s):

${errors.map((e, n) => `  ${n + 1})  ${(e as any)?.reason?.message}`).join(", ")}`
      );
    }

    savingFiles.push(cachedResource.save());

    progress.increment();

    let canvasEnrichmentSteps = canvasEnrichment;
    if (manifest.type === "Manifest" && runSteps) {
      // Need to make a copy in this case.
      canvasEnrichmentSteps = [...canvasEnrichmentSteps];
      for (const step of runSteps) {
        const found = allEnrichments.find((e) => e.id === step);
        if (found?.types.includes("Canvas") && !canvasEnrichmentSteps.includes(found)) {
          canvasEnrichmentSteps.push(found);
        }
      }
    }

    // Canvases.
    if (manifest.type === "Manifest" && canvasEnrichmentSteps.length) {
      const canvases = resource.items || [];
      for (let canvasIndex = 0; canvasIndex < canvases.length; canvasIndex++) {
        const canvas = canvases[canvasIndex];
        const cachedCanvasResource = createCacheResource({
          resource: canvases[canvasIndex],
          resourcePath: join(cacheDir, manifest.slug, "canvases", canvasIndex.toString()),
          temp,
          collections: {},
          canvasIndex,
          parentManifest: manifest,
        });

        const runEnrichment = async (enrichment: Enrichment) => {
          const storeConfig = enrichmentConfigs[enrichment.id] || {};
          const enrichmentConfig = Object.assign(
            {},
            storeConfig,
            config.stores[manifest.storeId].config?.[enrichment.id] || {}
          );
          const valid =
            !options.cache ||
            (await enrichment.invalidate(
              manifest,
              {
                caches: cachedCanvasResource.caches,
                resource: canvas,
                config,
                files: cachedCanvasResource.filesDir,
              },
              enrichmentConfig
            ));
          const canvasResource: ActiveResourceJson = {
            id: canvas.id,
            type: "Canvas",
            path: `${manifest.path}/canvases/${canvasIndex}`,
            slug: `${manifest.slug}/canvases/${canvasIndex}`,
            storeId: manifest.storeId,
            slugSource: manifest.slugSource,
            saveToDisk: false, // ?
            source: manifest.source,
            vault: manifest.vault,
          };
          if (!valid) {
            // console.log('Skipping "' + enrichment.name + '" for "' + manifest.slug + '" because it is not modified');
            return;
          }
          const result = await enrichment.handler(
            canvasResource,
            {
              meta: cachedCanvasResource.meta,
              indices: cachedCanvasResource.indices,
              caches: cachedCanvasResource.caches,
              config: config,
              builder,
              resource: canvas,
              files: cachedCanvasResource.filesDir,
              requestCache,
            },
            enrichmentConfig
          );

          cachedCanvasResource.handleResponse(result, enrichment);
          cachedResource.didChange(result.didChange);
        };

        const processedEnrichments = [];
        for (const enrichment of canvasEnrichmentSteps) {
          if (skipSteps.includes(enrichment.id)) {
            continue;
          }
          processedEnrichments.push(runEnrichment(enrichment));
        }

        const results = await Promise.allSettled(processedEnrichments);
        const errors = results.filter((r) => r.status === "rejected");
        if (errors.length > 0) {
          throw new Error(
            `Enrichment failed for ${errors.length} manifest(s):

${errors.map((e, n) => `  ${n + 1}) ${(e as any)?.reason?.message}`).join(", ")}`
          );
        }

        savingFiles.push(cachedCanvasResource.save());

        progress.increment();
      }
    } else {
      progress.increment(manifest.subResources || 0);
    }

    await cachedResource.saveVault();
  };

  const allManifestProcesses = [];
  for (const manifest of allResources) {
    allManifestProcesses.push(processManifest(manifest));
  }
  await Promise.all(allManifestProcesses);

  for (const extraction of allEnrichments) {
    if (extraction.close) {
      const extractionConfig = enrichmentConfigs[extraction.id] || {};
      await extraction.close(extractionConfig);
    }
    if (extraction.collect) {
      const extractionConfig = enrichmentConfigs[extraction.id] || {};
      await extraction.collect(temp[extraction.id], { config, build: buildConfig }, extractionConfig);
    }
  }

  progress.stop();

  log(`Saving ${savingFiles.length} files`);
  await Promise.all(savingFiles);
  savingFiles = [];
}
