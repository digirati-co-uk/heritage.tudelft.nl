import { createHash } from "node:crypto";
import nfs from "node:fs";
import { join } from "node:path";
import objectHash from "object-hash";
import type { IFS } from "unionfs";

export function createStoreRequestCache(storeKey: string, cacheDir: string, noCache = false, customFs?: IFS) {
  const fs = customFs?.promises || nfs.promises;
  const cache = new Map<string, any>();
  const didChangeCache = new Map<string, any>();

  async function pathExists(to: string) {
    try {
      await fs.stat(to);
      return true;
    } catch (e) {
      return false;
    }
  }

  function getCachePath(url: string) {
    const hash = createHash("sha256").update(url).digest("hex");
    return join(cacheDir, `${storeKey}/${hash}.json`);
  }

  async function readCached(url: string) {
    if (cache.has(url)) {
      return cache.get(url);
    }
    if (didChangeCache.has(url)) {
      return didChangeCache.get(url);
    }
    if (noCache) {
      return null;
    }

    const cachePath = getCachePath(url);
    if (!(await pathExists(cachePath))) {
      return null;
    }

    const rawData = (await fs.readFile(cachePath)).toString("utf-8");
    if (!rawData.length) {
      return null;
    }
    try {
      const data = JSON.parse(rawData);
      cache.set(url, data);
      return data;
    } catch (e) {
      return null;
    }
  }

  async function writeCached(url: string, data: any) {
    if (noCache) {
      return;
    }
    const dir = join(cacheDir, storeKey);
    const cachePath = getCachePath(url);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(data));
  }

  async function requestJson(url: string, options?: RequestInit) {
    const resp = await fetch(url, options);
    if (resp.status === 404) {
      return {};
    }
    return resp.json();
  }

  return {
    async getKey(url: string) {
      if (cache.has(url) || didChangeCache.has(url)) {
        return url;
      }
      if (noCache) {
        return null;
      }
      if (await pathExists(getCachePath(url))) {
        return url;
      }
      return null;
    },
    async didChange(url: string, options?: RequestInit) {
      if (didChangeCache.has(url)) {
        return true;
      }

      const data = await readCached(url);
      if (!data) {
        return true;
      }

      const freshData = await requestJson(url, options);

      const didChange = objectHash(data) !== objectHash(freshData as any);

      if (didChange) {
        didChangeCache.set(url, freshData as any);
      }

      return didChange;
    },
    async fetch(url: string, options?: RequestInit) {
      if (didChangeCache.has(url)) {
        const data = didChangeCache.get(url);
        didChangeCache.delete(url);
        cache.set(url, data as any);
        await writeCached(url, data);

        return data;
      }

      if (!noCache) {
        const data = await readCached(url);
        if (data) {
          return data;
        }
      }

      try {
        const data = await requestJson(url, options);
        cache.set(url, data as any);
        await writeCached(url, data);
        return data;
      } catch (e) {
        console.log("Error fetching", url, (e as any).message);
        console.error(e);
        throw e;
      }
    },
  };
}
