import PQueue from "p-queue";
import { discoverCollectionChildren, isCollectionLike } from "../../stores/iiif-remote-discovery.ts";
import type { IIIFRemoteStore } from "../../stores/iiif-remote.ts";
import { resolveNetworkConfig } from "../../util/network.ts";
import { createStoreRequestCache } from "../../util/store-request-cache.ts";
import type { BuildConfig } from "../build.ts";

interface WarmCacheState {
  storeRequestCaches: Record<string, ReturnType<typeof createStoreRequestCache>>;
}

interface WarmStats {
  stores: number;
  urls: number;
  failures: number;
}

function normalizeStoreUrls(storeConfig: IIIFRemoteStore) {
  if (storeConfig.urls && storeConfig.urls.length > 0) {
    return storeConfig.urls;
  }
  if (storeConfig.url) {
    return [storeConfig.url];
  }
  return [];
}

export async function warmRemoteStores(buildConfig: BuildConfig, state: WarmCacheState): Promise<WarmStats> {
  const { stores, config, requestCacheDir, options } = buildConfig;
  const stats: WarmStats = {
    stores: 0,
    urls: 0,
    failures: 0,
  };

  for (const storeId of stores) {
    const storeConfig = config.stores[storeId];
    if (!storeConfig || storeConfig.type !== "iiif-remote") {
      continue;
    }

    stats.stores += 1;

    const network = resolveNetworkConfig(buildConfig.network, storeConfig.network);
    const requestCache =
      options.cache && state.storeRequestCaches[storeId]
        ? state.storeRequestCaches[storeId]
        : createStoreRequestCache(storeId, requestCacheDir, !options.cache, undefined, network);
    state.storeRequestCaches[storeId] = requestCache;

    const queue = new PQueue({ concurrency: network.concurrency });
    const visited = new Set<string>();

    const enqueue = (url: string) => {
      if (!url || visited.has(url)) {
        return;
      }
      visited.add(url);
      stats.urls += 1;

      queue.add(async () => {
        try {
          const resource = await requestCache.fetch<any>(url);
          const id = resource?.["@id"] || resource?.id;
          if (!id || !isCollectionLike(resource)) {
            return;
          }

          const children = await discoverCollectionChildren(
            url,
            resource,
            (childUrl) => requestCache.fetch(childUrl),
            (childUrl, error) => {
              buildConfig.log(`Failed warming collection page ${childUrl}`, error);
            }
          );

          for (const child of children) {
            enqueue(child.id);
          }
        } catch (_error) {
          stats.failures += 1;
          buildConfig.log(`Failed warming URL: ${url}`);
        }
      });
    };

    for (const rootUrl of normalizeStoreUrls(storeConfig)) {
      enqueue(rootUrl);
    }

    await queue.onIdle();
  }

  return stats;
}
