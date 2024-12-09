import { BuildConfig } from "../build.ts";
import { ActiveResourceJson, ParsedResource, Store } from "../../util/store.ts";
import { createStoreRequestCache } from "../../util/store-request-cache.ts";
import { join } from "node:path";
import { existsSync } from "fs";
import { loadJson } from "../../util/load-json.ts";
import { mkdirp } from "mkdirp";
import { SingleBar } from "cli-progress";
import { makeProgressBar } from "../../util/make-progress-bar.ts";

export async function loadStores(
  { storeResources }: { storeResources: Record<string, ParsedResource[]> },
  buildConfig: BuildConfig,
) {
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
  } = buildConfig;

  const allResources: Array<ActiveResourceJson> = [];
  const allPaths: Record<string, string> = {};
  const overrides: Record<string, string> = {};
  const rewrites: Record<string, string> = {};
  const editable: Record<string, string> = {};
  const idsToSlugs: Record<string, { slug: string; type: string }> = {};
  const uniqueSlugs: string[] = [];

  for (const store of stores) {
    const requestCache = createStoreRequestCache(store, requestCacheDir);
    const storeConfig = config.stores[store];
    const resources = storeResources[store];

    const progress = makeProgressBar("Loading store", resources.length);

    for (const resource of resources) {
      if (
        options.exact &&
        (resource.slug !== options.exact || resource.path !== options.exact)
      ) {
        progress.increment();
        continue;
      }

      // Unique slug check. (NEEDS TO HAPPEN AFTER REWRITE)
      if (uniqueSlugs.includes(resource.slug)) {
        log(
          "WARNING: Duplicate slug found: " +
            resource.slug +
            " in resource: " +
            resource.path,
        );
        continue;
      }
      uniqueSlugs.push(resource.slug);

      // Here we need to actually load the existing folder from the cache if possible.
      const resourceDir = join(cacheDir, resource.slug);
      const cachesFile = join(resourceDir, "caches.json");
      const caches = existsSync(cachesFile) ? await loadJson(cachesFile) : {};
      const storeType: Store<any> = (storeTypes as any)[storeConfig.type];
      const valid =
        !options.cache ||
        (await storeType.invalidate(storeConfig as any, resource, caches));

      if (valid) {
        log("Building " + resource.path);
        await mkdirp(resourceDir);
        const data = await storeType.load(
          storeConfig as any,
          resource,
          resourceDir,
          { requestCache, storeId: resource.storeId, build: buildConfig },
        );

        if (data["resource.json"].id && data["resource.json"].saveToDisk) {
          idsToSlugs[data["resource.json"].id] = {
            slug: resource.slug,
            type: resource.type,
          };
        }

        allResources.push(data["resource.json"]);

        await Promise.all([
          Bun.write(
            join(resourceDir, "resource.json"),
            JSON.stringify(data["resource.json"], null, 2),
          ),
          Bun.write(
            join(resourceDir, "vault.json"),
            JSON.stringify(data["vault.json"], null, 2),
          ),
          Bun.write(
            join(resourceDir, "meta.json"),
            JSON.stringify(data["meta.json"], null, 2),
          ),
          Bun.write(
            join(resourceDir, "caches.json"),
            JSON.stringify(data["caches.json"], null, 2),
          ),
          Bun.write(
            join(resourceDir, "indices.json"),
            JSON.stringify(data["indices.json"], null, 2),
          ),
        ]);
      } else {
        const data = await loadJson(join(resourceDir, "resource.json"));

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
        editable[resource.slug] = resource.source.path;
      }
      if (resource.source.type === "disk" && resource.source.alias) {
        overrides[resource.source.alias] = resource.slug + "/manifest.json";
      }
      if (resource.source.type === "remote" && resource.saveToDisk) {
        overrides[resource.slug] = resource.slug + "/manifest.json";
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

  return { allResources, editable, allPaths, overrides, rewrites, idsToSlugs };
}
