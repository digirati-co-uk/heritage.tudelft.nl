import { join } from "node:path";
import type { IFS } from "unionfs";
import { makeGetSlugHelper } from "../../util/make-slug-helper.ts";
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

export async function parseStores(buildConfig: BuildConfig, cache: ParseStoresState = EMPTY_CACHE, customFs?: IFS) {
  const {
    //
    config,
    stores,
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

  // If there are generated stores, add them.
  if (config.generators) {
    const keys = Object.keys(config.generators);
    for (const key of keys) {
      const generator = config.generators[key];
      // Skip if there is a configured output. This is for the user to deal with.
      if (generator.output) continue;

      stores.push(key);
      config.stores[key] = {
        type: "iiif-json",
        path: `./${join(defaultCacheDir, key, "build")}`,
      };
    }
  }

  for (const storeId of stores) {
    const requestCache =
      cache.storeRequestCaches[storeId] || createStoreRequestCache(storeId, requestCacheDir, false, customFs);
    storeRequestCaches[storeId] = requestCache;
    storeResources[storeId] = [];

    const storeConfig = config.stores[storeId];
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
  }

  return {
    storeResources,
    storeRequestCaches,
    filesToWatch,
  };
}
