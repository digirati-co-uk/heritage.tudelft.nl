import { join } from "node:path";
import type { IFS } from "unionfs";
import type { BuildProgressCallbacks } from "../../util/build-progress.ts";
import { makeGetSlugHelper } from "../../util/make-slug-helper.ts";
import { resolveNetworkConfig } from "../../util/network.ts";
import { createStoreRequestCache } from "../../util/store-request-cache.ts";
import type { ParsedResource, Store } from "../../util/store.ts";
import type { BuildConfig } from "../build.ts";
import { defaultCacheDir } from "../generate.ts";

interface ParseStoresState {
  storeRequestCaches: Record<string, ReturnType<typeof createStoreRequestCache>>;
}

const EMPTY_CACHE: ParseStoresState = {
  storeRequestCaches: {},
};

function getRemoteStoreRootUrls(storeConfig: any): string[] {
  if (!storeConfig || storeConfig.type !== "iiif-remote") {
    return [];
  }
  if (Array.isArray(storeConfig.urls) && storeConfig.urls.length) {
    return storeConfig.urls.filter(Boolean);
  }
  if (typeof storeConfig.url === "string" && storeConfig.url) {
    return [storeConfig.url];
  }
  return [];
}

export async function parseStores(
  buildConfig: BuildConfig,
  cache: ParseStoresState = EMPTY_CACHE,
  customFs?: IFS,
  progress?: BuildProgressCallbacks
) {
  const {
    //
    config,
    stores,
    options,
    requestCacheDir,
    storeTypes,
    slugs,
    manifestRewrites,
    collectionRewrites,
    files,
  } = buildConfig;

  const storeResources: Record<string, ParsedResource[]> = {};
  const storeRequestCaches: Record<string, ReturnType<typeof createStoreRequestCache>> = {};
  const filesToWatch: string[] = [];
  const effectiveStoreConfigs: Record<string, any> = { ...config.stores };
  const effectiveStores = Array.from(new Set(stores));
  let estimatedResources = 0;

  const publishEstimatedResources = () => {
    const parsedResources = Object.values(storeResources).reduce((total, all) => total + all.length, 0);
    progress?.onResourcesDiscovered?.({
      total: Math.max(parsedResources, estimatedResources),
    });
  };

  // If there are generated stores, add them to local derived config/stores.
  // Do not mutate buildConfig.config/buildConfig.stores to avoid repeated-build side effects.
  if (config.generators) {
    const keys = Object.keys(config.generators);
    for (const key of keys) {
      const generator = config.generators[key];
      // Skip if there is a configured output. This is for the user to deal with.
      if (generator.output) continue;

      if (!effectiveStoreConfigs[key]) {
        effectiveStoreConfigs[key] = {
          type: "iiif-json",
          path: `./${join(defaultCacheDir, key, "build")}`,
        };
      }
      if (!effectiveStores.includes(key)) {
        effectiveStores.push(key);
      }
    }
  }

  for (const storeId of effectiveStores) {
    const storeConfig = effectiveStoreConfigs[storeId];
    if (!storeConfig) {
      throw new Error(`Missing store config for "${storeId}"`);
    }
    const network = resolveNetworkConfig(buildConfig.network, storeConfig.network);
    const useNetworkCache = options.networkCache ?? true;
    const requestCache =
      useNetworkCache && cache.storeRequestCaches[storeId]
        ? cache.storeRequestCaches[storeId]
        : createStoreRequestCache(storeId, requestCacheDir, !useNetworkCache, customFs, network, (event) => {
            progress?.onFetch?.({
              ...event,
              phase: "parse-stores",
            });
          });
    storeRequestCaches[storeId] = requestCache;
    storeResources[storeId] = [];

    const rootUrls = getRemoteStoreRootUrls(storeConfig);
    if (rootUrls.length) {
      estimatedResources += rootUrls.length;
      publishEstimatedResources();
    }

    const storeType: Store<any> = (storeTypes as any)[storeConfig.type];
    if (!storeType) {
      throw new Error(`Unknown store type: ${storeConfig.type}`);
    }

    const getSlug = makeGetSlugHelper(storeConfig, slugs);

    // Parse the store using the plugin definition. This will return one or more resources.
    const resources = await storeType.parse(storeConfig as any, {
      storeId,
      requestCache,
      getSlug,
      build: buildConfig,
      files: files,
      progress,
      reportEstimatedResources: (delta: number) => {
        if (delta <= 0) {
          return;
        }
        estimatedResources += delta;
        publishEstimatedResources();
      },
    });

    // Loop through the resources.
    for (const resource of resources) {
      // Rewrite the slug.
      if (resource.type === "Manifest") {
        for (const rewrite of manifestRewrites) {
          if (rewrite.rewrite) {
            const newSlug = await rewrite.rewrite(resource.slug, resource);
            if (newSlug && typeof newSlug === "string") {
              resource.slug = newSlug;
            }
          }
        }
      }
      if (resource.type === "Collection") {
        for (const rewrite of collectionRewrites) {
          if (rewrite.rewrite) {
            const newSlug = await rewrite.rewrite(resource.slug, resource);
            if (newSlug && typeof newSlug === "string") {
              resource.slug = newSlug;
            }
          }
        }
      }

      if (resource.source?.type === "disk") {
        filesToWatch.push(resource.path);
      }
      storeResources[storeId].push(resource);
    }
    const totalDiscovered = Object.values(storeResources).reduce((total, all) => total + all.length, 0);
    progress?.onResourcesDiscovered?.({
      total: totalDiscovered,
      storeId,
    });
  }

  return {
    storeResources,
    storeRequestCaches,
    filesToWatch,
    storeIds: effectiveStores,
    storeConfigs: effectiveStoreConfigs,
  };
}
