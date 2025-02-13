import nfs from "node:fs";
import { join } from "node:path";
import type { IFS } from "unionfs";
import { makeProgressBar } from "../../util/make-progress-bar.ts";
import { createStoreRequestCache } from "../../util/store-request-cache.ts";
import type {
  ActiveResourceJson,
  ParsedResource,
  Store,
} from "../../util/store.ts";
import type { BuildConfig } from "../build.ts";

export async function loadStores(
  { storeResources }: { storeResources: Record<string, ParsedResource[]> },
  buildConfig: BuildConfig,
  customFs?: IFS,
) {
  const fss = customFs || nfs;
  const fs = fss.promises;
  const {
    options,
    config,
    stores,
    cacheDir,
    storeTypes,
    requestCacheDir,
    log,
    canvasExtractions,
    canvasEnrichment,
    files,
  } = buildConfig;

  const allResources: Array<ActiveResourceJson> = [];
  const allPaths: Record<string, string> = {};
  const overrides: Record<string, string> = {};
  const rewrites: Record<string, string> = {};
  const editable: Record<string, string> = {};
  const idsToSlugs: Record<string, { slug: string; type: string }> = {};
  const uniqueSlugs: string[] = [];

  let validCount = 0;
  let invalidCount = 0;

  for (const store of stores) {
    const requestCache = createStoreRequestCache(store, requestCacheDir);
    const storeConfig = config.stores[store];
    const resources = storeResources[store];

    const progress = makeProgressBar(
      "Loading store",
      resources.length,
      options.ui,
    );

    for (const resource of resources) {
      if (
        options.exact &&
        resource.slug !== options.exact &&
        resource.path !== options.exact
      ) {
        progress.increment();
        continue;
      }

      // Unique slug check. (NEEDS TO HAPPEN AFTER REWRITE)
      if (uniqueSlugs.includes(resource.slug)) {
        log(
          `WARNING: Duplicate slug found: ${resource.slug} in resource: ${resource.path}`,
        );
        continue;
      }
      uniqueSlugs.push(resource.slug);

      // Here we need to actually load the existing folder from the cache if possible.
      const resourceDir = join(cacheDir, resource.slug);
      const cachesFile = join(resourceDir, "caches.json");
      const caches = await files.loadJson(cachesFile);
      const storeType: Store<any> = (storeTypes as any)[storeConfig.type];
      const shouldRebuild =
        !options.cache ||
        (await storeType.invalidate(storeConfig as any, resource, caches));

      if (shouldRebuild) {
        log(`Building ${resource.path}`);
        invalidCount++;
        await files.mkdir(resourceDir);
        const data = await storeType.load(
          storeConfig as any,
          resource,
          resourceDir,
          {
            requestCache,
            storeId: resource.storeId,
            build: buildConfig,
            files,
          },
        );

        if (data["resource.json"].id && data["resource.json"].saveToDisk) {
          idsToSlugs[data["resource.json"].id] = {
            slug: resource.slug,
            type: resource.type,
          };
        }

        allResources.push(data["resource.json"]);

        await Promise.all([
          files.saveJson(
            join(resourceDir, "resource.json"),
            data["resource.json"],
          ),
          files.saveJson(join(resourceDir, "vault.json"), data["vault.json"]),
          files.saveJson(join(resourceDir, "meta.json"), data["meta.json"]),
          files.saveJson(join(resourceDir, "caches.json"), data["caches.json"]),
          files.saveJson(
            join(resourceDir, "indices.json"),
            data["indices.json"],
          ),
        ]);
      } else {
        validCount++;
        const data = await files.loadJson(join(resourceDir, "resource.json"));

        if (data.id && data.saveToDisk) {
          idsToSlugs[data.id] = {
            slug: resource.slug,
            type: resource.type,
          };
        }
        allResources.push(data);
      }

      // Record all paths at the end, the rewrite should have happened by now.
      if (resource.source && resource.source.type === "disk") {
        editable[resource.slug] = resource.source.filePath;
      }
      if (resource.source.type === "disk" && resource.source.alias) {
        overrides[resource.source.alias] = `${resource.slug}/manifest.json`;
      }
      if (resource.source.type === "remote" && resource.saveToDisk) {
        overrides[resource.slug] = `${resource.slug}/manifest.json`;
      }

      allPaths[resource.path] = resource.slug;
      if (resource.subFiles) {
        for (const subFile of resource.subFiles) {
          allPaths[subFile] = resource.slug;
        }
      }

      progress.increment();
    }
    progress.stop();
  }

  return {
    allResources,
    editable,
    allPaths,
    overrides,
    rewrites,
    idsToSlugs,
    stats: {
      validCount,
      invalidCount,
    },
  };
}
