import { createStoreRequestCache } from "../../util/store-request-cache.ts";
import { ParsedResource, Store } from "../../util/store.ts";
import { BuildConfig } from "../build.ts";
import { mkdirp } from "mkdirp";
import { makeGetSlugHelper } from "../../util/make-slug-helper.ts";
import { join } from "node:path";
import { cwd } from "node:process";
import { defaultCacheDir } from "../generate.ts";

export async function parseStores(buildConfig: BuildConfig) {
  const {
    //
    config,
    stores,
    requestCacheDir,
    storeTypes,
    slugs,
    manifestRewrites,
    collectionRewrites,
  } = buildConfig;

  await mkdirp(requestCacheDir);

  const storeResources: Record<string, ParsedResource[]> = {};
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
        path: "./" + join(defaultCacheDir, key, "build"),
      };
    }
  }

  for (const storeId of stores) {
    const requestCache = createStoreRequestCache(storeId, requestCacheDir);
    storeResources[storeId] = [];

    const storeConfig = config.stores[storeId];
    const storeType: Store<any> = (storeTypes as any)[storeConfig.type];
    if (!storeType) {
      throw new Error("Unknown store type: " + storeConfig.type);
    }

    const getSlug = makeGetSlugHelper(storeConfig, slugs);

    // Parse the store using the plugin definition. This will return one or more resources.
    const resources = await storeType.parse(storeConfig as any, {
      storeId,
      requestCache,
      getSlug,
      build: buildConfig,
    });

    // Loop through the resources.
    for (const resource of resources) {
      // Rewrite the slug.
      if (resource.type === "Manifest") {
        for (const rewrite of manifestRewrites) {
          if (rewrite.rewrite) {
            let newSlug = await rewrite.rewrite(resource.slug, resource);
            if (newSlug && typeof newSlug === "string") {
              resource.slug = newSlug;
            }
          }
        }
      }
      if (resource.type === "Collection") {
        for (const rewrite of collectionRewrites) {
          if (rewrite.rewrite) {
            let newSlug = await rewrite.rewrite(resource.slug, resource);
            if (newSlug && typeof newSlug === "string") {
              resource.slug = newSlug;
            }
          }
        }
      }

      filesToWatch.push(resource.path);
      storeResources[storeId].push(resource);
    }
  }

  return {
    storeResources,
    filesToWatch,
  };
}
