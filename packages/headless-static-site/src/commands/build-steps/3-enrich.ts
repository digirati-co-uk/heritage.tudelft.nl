import { join } from "node:path";
import PQueue from "p-queue";
import { createCacheResource } from "../../util/cached-resource.ts";
import { createResourceHandler } from "../../util/create-resource-handler.ts";
import type { CanvasSearchIndex, Enrichment } from "../../util/enrich.ts";
import type { RemoteRecordLink, SearchIndexes, SearchRecordReturn } from "../../util/extract.ts";
import { makeProgressBar } from "../../util/make-progress-bar.ts";
import { mergeIndices } from "../../util/merge-indices.ts";
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
    files,
    search,
    trace,
    concurrency,
  } = buildConfig;

  const start = performance.now();
  const queue = new PQueue({ concurrency: concurrency.enrich });

  if (!options.enrich) {
    return {};
  }

  const stats = {
    configiure: {} as Record<string, number>,
    run: {} as Record<string, number>,
    total: 0,
  };

  // Search setup.
  const searchIndexes: SearchIndexes = Object.fromEntries(
    search.indexes.map((index) => [
      index.indexName,
      {
        ...index,
        records: [] as Array<Record<string, any>>,
        remoteRecords: {} as Record<string, RemoteRecordLink[]>,
        keys: (index.schema.fields || []).map((field) => {
          if (field.name.includes(".")) {
            const parts = field.name.split(".");
            return parts[0]; // object keys.
          }
          return field.name;
        }),
      },
    ])
  );

  const canvasSearchIndex: CanvasSearchIndex = {};

  function addToSearchIndex(search: Partial<SearchRecordReturn>, indices: Record<string, string[]>) {
    const result: Array<{ index: string; record?: any; remoteRecords?: RemoteRecordLink[] }> = [];
    if (search.indexes && search.record) {
      for (const index of search.indexes) {
        if (searchIndexes[index]) {
          const record = Object.fromEntries(
            Object.entries(search.record).filter(([key]) => searchIndexes[index].keys.includes(key))
          );
          if (searchIndexes[index].allIndices) {
            const keys = Object.keys(indices);
            for (const facet of keys) {
              record[`topic_${facet}`] = indices[facet];
            }
          } else if (searchIndexes[index].indices?.length) {
            for (const facet of searchIndexes[index].indices || []) {
              if (indices[facet]) {
                record[`topic_${facet}`] = indices[facet];
              }
            }
          }
          if (search.remoteRecords?.[index]) {
            result.push({ index, remoteRecords: search.remoteRecords?.[index] });
          }
          if (Object.keys(record).length) {
            searchIndexes[index].records.push(record);
            result.push({ index, record });
          }
        }
      }
    }
    return result;
  }

  // All indcies found.
  const allIndices: Record<string, string[]> = {};
  function recordIndices(indices: Record<string, string[]>) {
    mergeIndices(allIndices, indices);
  }

  const enrichmentConfigs: Record<string, any> = {};
  const temp: Record<string, Record<string, any>> = {};
  for (const enrichment of allEnrichments) {
    if (enrichment.configure) {
      const enrichmentConfig = config.config?.[enrichment.id];
      const start = performance.now();
      enrichmentConfigs[enrichment.id] = await enrichment.configure(
        { config, build: buildConfig, fileHandler: files },
        enrichmentConfig
      );
      stats.configiure[enrichment.id] = performance.now() - start;
    } else {
      enrichmentConfigs[enrichment.id] = config.config?.[enrichment.id];
    }
  }

  let savingFiles: Promise<any>[] = [];
  let totalResources = allResources.length;
  for (const resource of allResources) {
    totalResources += resource.subResources || 0;
  }

  const progress = makeProgressBar("Enrichment", totalResources, options.ui);
  const requestCache = createStoreRequestCache(
    "_enrich",
    requestCacheDir,
    !options.cache,
    undefined,
    buildConfig.network
  );

  const processManifest = async (manifest: ActiveResourceJson) => {
    trace?.startEnrich(manifest);

    if (!manifest.vault) {
      progress.increment(1 + (manifest.subResources || 0));
      trace?.endEnrich(manifest);
      return;
    }
    const resourceStoreConfig = config.stores[manifest.storeId] || {};
    const skipSteps = resourceStoreConfig.skip || [];
    const runSteps = resourceStoreConfig.run;

    const cachedResource = createCacheResource({
      resource: manifest,
      resourcePath: join(cacheDir, manifest.slug),
      temp,
      collections: {},
      fileHandler: files,
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
      const startTime = performance.now();
      const filesDir = join(cacheDir, manifest.slug, "files");
      const resourceFiles = createResourceHandler(filesDir, files);
      const storeConfig = enrichmentConfigs[enrichment.id] || {};
      const enrichmentConfig = Object.assign({}, storeConfig, resourceStoreConfig.config?.[enrichment.id] || {});

      const valid =
        !options.cache ||
        (await enrichment.invalidate(
          manifest,
          {
            caches: cachedResource.caches,
            resource,
            config,
            files: filesDir,
            resourceFiles,
            fileHandler: files,
          },
          enrichmentConfig
        ));
      if (!valid) {
        trace?.enrichCacheHit(manifest, enrichment);
        // console.log('Skipping "' + enrichment.name + '" for "' + manifest.slug + '" because it is not modified');
        return;
      }

      const result = await enrichment.handler(
        manifest,
        {
          meta: cachedResource.meta,
          indices: cachedResource.indices,
          caches: cachedResource.caches,
          searchRecord: cachedResource.searchRecord,
          config,
          builder,
          resource,
          files: filesDir,
          requestCache,
          fileHandler: files,
          resourceFiles,
        },
        enrichmentConfig
      );
      trace?.enrich(manifest, enrichment, result, startTime, performance.now());
      cachedResource.handleResponse(result, enrichment);

      stats.run[enrichment.id] = (stats.run[enrichment.id] || 0) + (performance.now() - startTime);
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

    // savingFiles.push(cachedResource.save());
    const indices = await cachedResource.indices.value;
    addToSearchIndex(await cachedResource.searchRecord.value, indices);
    recordIndices(indices);
    await cachedResource.save();
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
      const manifestQueue = new PQueue({ concurrency: concurrency.enrichCanvas });
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
          fileHandler: files,
        });

        const runEnrichment = async (enrichment: Enrichment) => {
          const startTime = performance.now();
          const storeConfig = enrichmentConfigs[enrichment.id] || {};
          const enrichmentConfig = Object.assign({}, storeConfig, resourceStoreConfig.config?.[enrichment.id] || {});
          const resourceFiles = createResourceHandler(cachedCanvasResource.filesDir, files);

          const valid =
            !options.cache ||
            (await enrichment.invalidate(
              manifest,
              {
                caches: cachedCanvasResource.caches,
                resource: canvas,
                config,
                files: cachedCanvasResource.filesDir,
                resourceFiles,
                fileHandler: files,
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
          try {
            const result = await enrichment.handler(
              canvasResource,
              {
                meta: cachedCanvasResource.meta,
                indices: cachedCanvasResource.indices,
                caches: cachedCanvasResource.caches,
                searchRecord: cachedCanvasResource.searchRecord,
                config: config,
                builder,
                resource: canvas,
                files: cachedCanvasResource.filesDir,
                requestCache,
                fileHandler: files,
                resourceFiles,
              },
              enrichmentConfig
            );

            cachedCanvasResource.handleResponse(result, enrichment);
            cachedResource.didChange(result.didChange);
            stats.run[enrichment.id] = (stats.run[enrichment.id] || 0) + (performance.now() - startTime);
          } catch (error) {
            console.log("[skipped]", enrichment.id, "\nmanifest:", manifest?.id);
          }
        };
        manifestQueue.add(async () => {
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
            console.log(errors);
            throw new Error(
              `Enrichment failed for ${errors.length} manifest(s):

${errors.map((e, n) => `  ${n + 1}) ${(e as any)?.reason?.message}`).join(", ")}`
            );
          }

          const indices = await cachedResource.indices.value;
          const record = await cachedCanvasResource.searchRecord.value;
          const searchIndexResult = addToSearchIndex(record, indices);
          for (const result of searchIndexResult) {
            if (result.index) {
              canvasSearchIndex[manifest.slug] = canvasSearchIndex[manifest.slug] || {};
              canvasSearchIndex[manifest.slug][result.index] = canvasSearchIndex[manifest.slug][result.index] || {
                records: [],
                remoteRecords: [],
              };
              if (result.remoteRecords) {
                for (const remote of result.remoteRecords) {
                  if (!canvasSearchIndex[manifest.slug][result.index].remoteRecords.find((r) => r.url === remote.url)) {
                    canvasSearchIndex[manifest.slug][result.index].remoteRecords.push(remote);
                  }
                }
              }
              if (result.record) {
                // Add to manifest
                canvasSearchIndex[manifest.slug][result.index].records.push(result.record);
              }
            }
          }
          recordIndices(indices);
          savingFiles.push(cachedCanvasResource.save());

          progress.increment();

          return true;
        });
      }
      await manifestQueue.onIdle();
    } else {
      progress.increment(manifest.subResources || 0);
    }
    trace?.endEnrich(manifest);
    await cachedResource.saveVault();
  };

  for (const manifest of allResources) {
    queue.add(async () => processManifest(manifest));
  }

  await queue.onIdle();

  for (const enrichment of allEnrichments) {
    queue.add(async () => {
      const startTime = performance.now();
      if (enrichment.close) {
        const enrichmentConfig = enrichmentConfigs[enrichment.id] || {};
        await enrichment.close(enrichmentConfig);
      }
      if (enrichment.collect) {
        const enrichmentConfig = enrichmentConfigs[enrichment.id] || {};
        await enrichment.collect(
          temp[enrichment.id],
          { config, build: buildConfig, fileHandler: files },
          enrichmentConfig
        );
        stats.run[enrichment.id] = (stats.run[enrichment.id] || 0) + (performance.now() - startTime);
      }
    });
  }

  await queue.onIdle();

  progress.stop();

  log(`Saving ${savingFiles.length} files`);
  await Promise.all(savingFiles);
  savingFiles = [];

  stats.total = performance.now() - start;

  return {
    stats,
    searchIndexes,
    canvasSearchIndex,
    allIndices,
  };
}
