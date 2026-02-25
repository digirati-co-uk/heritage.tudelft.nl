import { stat } from "node:fs/promises";
import { join } from "node:path";
import objectHash from "object-hash";
import PQueue from "p-queue";
import { createCacheResource } from "../../util/cached-resource.ts";
import { createResourceHandler } from "../../util/create-resource-handler.ts";
import type { LinkerPreparedData } from "../../util/linker.ts";
import type { ActiveResourceJson } from "../../util/store.ts";
import type { BuildConfig } from "../build.ts";

type LinkerCache = {
  resources: Record<
    string,
    {
      configHash: string;
      trackedFiles: Record<string, string>;
      prepareHash: string;
    }
  >;
};

function splitTarget(target: string) {
  const fragmentStart = target.indexOf("#");
  if (fragmentStart === -1) {
    return { id: target, fragment: null };
  }

  return {
    id: target.slice(0, fragmentStart),
    fragment: target.slice(fragmentStart + 1),
  };
}

async function getFileSignature(filePath: string) {
  try {
    const file = await stat(filePath);
    return `${file.mtimeMs}-${file.ctimeMs}-${file.size}`;
  } catch (error) {
    return "missing";
  }
}

export async function link(
  {
    allResources,
  }: {
    allResources: Array<ActiveResourceJson>;
  },
  buildConfig: BuildConfig
) {
  const { config, options, cacheDir, files, linkers, allLinkers } = buildConfig;
  if (!linkers.length && !allLinkers.length) {
    return {
      stats: {
        linked: 0,
        cacheHit: 0,
      },
    };
  }

  const resourcesById = Object.fromEntries(
    allResources.filter((resource) => resource.id).map((resource) => [resource.id, resource])
  );
  const manifests = allResources.filter((resource) => resource.type === "Manifest");
  const manifestVaults: Record<string, any> = {};
  const canvasOwnerCache = new Map<string, { manifest: ActiveResourceJson; canvasIndex: number }>();

  async function getManifestObject(manifest: ActiveResourceJson) {
    if (manifestVaults[manifest.slug]) {
      return manifestVaults[manifest.slug];
    }
    const cachedResource = createCacheResource({
      resource: manifest,
      temp: {},
      resourcePath: join(cacheDir, manifest.slug),
      collections: {},
      fileHandler: files,
    });
    const manifestResource = await cachedResource.attachVault();
    manifestVaults[manifest.slug] = manifestResource;
    return manifestResource;
  }

  async function getCanvasOwner(canvasId: string) {
    if (canvasOwnerCache.has(canvasId)) {
      return canvasOwnerCache.get(canvasId) || null;
    }

    for (const manifest of manifests) {
      const manifestResource = await getManifestObject(manifest);
      const items = manifestResource?.items || [];
      for (let canvasIndex = 0; canvasIndex < items.length; canvasIndex++) {
        const canvas = items[canvasIndex];
        if (!canvas?.id) {
          continue;
        }
        const value = {
          manifest,
          canvasIndex,
        };
        canvasOwnerCache.set(canvas.id, value);
        if (canvas.id === canvasId) {
          return value;
        }
      }
    }

    return null;
  }

  const linkerHelpers = {
    splitTarget,
    getManifestById: (id: string) => resourcesById[id] || null,
    getCanvasOwner,
  };

  const linkersCacheDir = join(cacheDir, "_linkers");
  const linkerCacheFiles: Record<string, LinkerCache> = {};
  const linkerConfigs: Record<string, any> = {};
  const prepareState: Record<
    string,
    {
      data: LinkerPreparedData<any>;
      hash: string;
      trackedFiles: Record<string, string>;
      trackedFilesList: string[];
    }
  > = {};
  const linkerCodeHashes: Record<string, string> = {};

  async function getPreparedState(linkerId: string, linker: any, linkerConfig: any) {
    const configHash = objectHash(linkerConfig || {});
    const cacheKey = `${linkerId}:${configHash}`;
    if (prepareState[cacheKey]) {
      return prepareState[cacheKey];
    }

    const trackedFiles = new Set<string>();
    const trackFile = (path: string) => {
      trackedFiles.add(files.resolve(path));
    };

    let data: LinkerPreparedData<any> = {};
    if (linker.prepare) {
      const prepared = await linker.prepare(
        {
          build: buildConfig,
          config,
          fileHandler: files,
          resources: allResources,
          manifests,
          helpers: linkerHelpers,
          trackFile,
          trackedFiles: [],
        },
        linkerConfig
      );
      data = prepared || {};
    }

    const trackedFileSignatures: Record<string, string> = {};
    for (const trackedFilePath of trackedFiles) {
      trackedFileSignatures[trackedFilePath] = await getFileSignature(trackedFilePath);
    }

    const hash = objectHash({
      config: linkerConfig || {},
      code: linkerCodeHashes[linkerId] || "",
      trackedFiles: trackedFileSignatures,
      data,
    });

    prepareState[cacheKey] = {
      data,
      hash,
      trackedFiles: trackedFileSignatures,
      trackedFilesList: Object.keys(trackedFileSignatures),
    };
    return prepareState[cacheKey];
  }

  for (const linker of allLinkers) {
    linkerCodeHashes[linker.id] = objectHash({
      handler: linker.handler?.toString?.() || "",
      prepare: linker.prepare?.toString?.() || "",
      invalidate: linker.invalidate?.toString?.() || "",
      configure: linker.configure?.toString?.() || "",
    });

    if (linker.configure) {
      linkerConfigs[linker.id] = await linker.configure(
        { config, build: buildConfig, fileHandler: files },
        config.config?.[linker.id]
      );
    } else {
      linkerConfigs[linker.id] = config.config?.[linker.id];
    }
    linkerCacheFiles[linker.id] = (await files.loadJson(
      join(linkersCacheDir, `${linker.id}.json`),
      true
    )) as LinkerCache;
    if (!linkerCacheFiles[linker.id].resources) {
      linkerCacheFiles[linker.id] = {
        resources: {},
      };
    }
  }

  let linked = 0;
  let cacheHit = 0;
  const queue = new PQueue();
  for (const activeResource of allResources) {
    queue.add(async () => {
      const storeConfig = config.stores[activeResource.storeId] as any;
      const skipSteps = storeConfig?.skip || [];
      const runSteps = storeConfig?.run;

      let resourceLinkers = linkers.filter((linker) => linker.types.includes(activeResource.type));
      if (runSteps) {
        resourceLinkers = [...resourceLinkers];
        for (const step of runSteps) {
          const found = allLinkers.find((linker) => linker.id === step);
          if (found?.types.includes(activeResource.type) && !resourceLinkers.includes(found)) {
            resourceLinkers.push(found);
          }
        }

        resourceLinkers = resourceLinkers.sort((a, b) => {
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

      if (!resourceLinkers.length) {
        return;
      }

      const cachedResource = createCacheResource({
        resource: activeResource,
        temp: {},
        resourcePath: join(cacheDir, activeResource.slug),
        collections: {},
        fileHandler: files,
      });
      const resource = await cachedResource.attachVault();
      const builder = await cachedResource.getVaultBuilder();
      const filesDir = join(cacheDir, activeResource.slug, "files");
      const resourceFiles = createResourceHandler(filesDir, files);

      for (const linker of resourceLinkers) {
        if (skipSteps.includes(linker.id)) {
          continue;
        }

        const linkerConfig = Object.assign(
          {},
          config.config?.[linker.id],
          linkerConfigs[linker.id] || {},
          storeConfig?.config?.[linker.id] || {}
        );
        const configHash = objectHash({
          config: linkerConfig || {},
          code: linkerCodeHashes[linker.id] || "",
        });
        const linkerCache = linkerCacheFiles[linker.id];
        const previousCache = linkerCache.resources[activeResource.slug];
        const preparedState = await getPreparedState(linker.id, linker, linkerConfig);
        const preparedForResource =
          preparedState.data.byResourceSlug?.[activeResource.slug] ||
          preparedState.data.byResourceId?.[activeResource.id || ""] ||
          undefined;

        const trackedFiles = new Set<string>();
        const trackFile = (path: string) => {
          trackedFiles.add(files.resolve(path));
        };
        if (activeResource.source?.type === "disk" && activeResource.source.filePath) {
          trackFile(activeResource.source.filePath);
        }

        let shouldRun = true;
        if (options.cache) {
          if (linker.invalidate) {
            shouldRun = await linker.invalidate(
              activeResource,
              {
                build: buildConfig,
                config,
                resource,
                builder,
                helpers: linkerHelpers,
                prepared: preparedForResource,
                preparedAll: preparedState.data,
                prepareHash: preparedState.hash,
                caches: cachedResource.caches,
                filesDir,
                fileHandler: files,
                resourceFiles,
                trackFile,
                trackedFiles: Object.keys(previousCache?.trackedFiles || {}),
              },
              linkerConfig
            );
          } else if (previousCache?.configHash === configHash && previousCache.prepareHash === preparedState.hash) {
            shouldRun = false;
            for (const trackedFilePath of Object.keys(previousCache.trackedFiles || {})) {
              const nextSignature = await getFileSignature(trackedFilePath);
              if (previousCache.trackedFiles[trackedFilePath] !== nextSignature) {
                shouldRun = true;
                break;
              }
            }
          }
        }

        if (!shouldRun) {
          cacheHit++;
          continue;
        }

        const result = await linker.handler(
          activeResource,
          {
            build: buildConfig,
            config,
            resource,
            builder,
            helpers: linkerHelpers,
            prepared: preparedForResource,
            preparedAll: preparedState.data,
            prepareHash: preparedState.hash,
            meta: cachedResource.meta,
            caches: cachedResource.caches,
            filesDir,
            fileHandler: files,
            resourceFiles,
            trackFile,
            trackedFiles: Object.keys(previousCache?.trackedFiles || {}),
          },
          linkerConfig
        );

        cachedResource.handleResponse(result, linker);
        linked++;

        const trackedFileSignatures: Record<string, string> = {};
        for (const trackedFilePath of trackedFiles) {
          trackedFileSignatures[trackedFilePath] = await getFileSignature(trackedFilePath);
        }

        linkerCache.resources[activeResource.slug] = {
          configHash,
          trackedFiles: trackedFileSignatures,
          prepareHash: preparedState.hash,
        };
      }

      await cachedResource.save();
    });
  }

  await queue.onIdle();

  for (const linker of allLinkers) {
    await files.saveJson(join(linkersCacheDir, `${linker.id}.json`), linkerCacheFiles[linker.id]);
  }

  return {
    stats: {
      linked,
      cacheHit,
    },
  };
}
