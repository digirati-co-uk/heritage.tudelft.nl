import { createHash } from "node:crypto";
import nfs from "node:fs";
import { join } from "node:path";
import objectHash from "object-hash";
import PQueue from "p-queue";
import type { IFS } from "unionfs";
import { type NetworkConfig, resolveNetworkConfig } from "./network";

export type StoreRequestCacheProgressEvent = {
  type: "queued" | "started" | "completed" | "failed" | "cache-hit";
  url: string;
  storeId: string;
};

function sleep(ms: number) {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(value: string | null) {
  if (!value) {
    return null;
  }
  const asSeconds = Number(value);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.round(asSeconds * 1000);
  }
  const asDate = Date.parse(value);
  if (Number.isNaN(asDate)) {
    return null;
  }
  return Math.max(0, asDate - Date.now());
}

function calculateBackoffMs(
  attempt: number,
  {
    baseDelayMs,
    maxDelayMs,
    jitterRatio,
  }: {
    baseDelayMs: number;
    maxDelayMs: number;
    jitterRatio: number;
  }
) {
  const rawDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  if (jitterRatio === 0) {
    return rawDelay;
  }
  const jitter = rawDelay * jitterRatio;
  const min = Math.max(0, rawDelay - jitter);
  const max = rawDelay + jitter;
  return Math.round(min + Math.random() * (max - min));
}

function isRetryableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }
  const name = (error as any).name;
  const code = (error as any).code;
  return name === "TypeError" || name === "AbortError" || code === "ECONNRESET" || code === "ETIMEDOUT";
}

async function readJsonResponse(resp: Response, url: string) {
  const raw = await resp.text();
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON response from ${url}: ${(error as Error).message}`);
  }
}

export function createStoreRequestCache(
  storeKey: string,
  cacheDir: string,
  noCache = false,
  customFs?: IFS,
  networkConfig?: NetworkConfig,
  onProgress?: (event: StoreRequestCacheProgressEvent) => void
) {
  const network = resolveNetworkConfig(networkConfig);
  const fs = customFs?.promises || nfs.promises;
  const cache = new Map<string, any>();
  const didChangeCache = new Map<string, any>();
  const inFlight = new Map<string, Promise<any>>();
  const fetchQueue = new PQueue({ concurrency: network.concurrency });
  let lastStartedRequest = 0;
  let nextRequestStart = Promise.resolve();

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

  async function requestWithPacing(url: string, options?: RequestInit): Promise<Response> {
    const slot = nextRequestStart;
    let release: () => void = () => {};
    nextRequestStart = new Promise<void>((resolve) => {
      release = resolve;
    });
    await slot;

    if (network.minDelayMs > 0) {
      const now = Date.now();
      const elapsed = now - lastStartedRequest;
      if (elapsed < network.minDelayMs) {
        await sleep(network.minDelayMs - elapsed);
      }
      lastStartedRequest = Date.now();
    }

    release();
    return fetch(url, options);
  }

  async function requestJson(url: string, options?: RequestInit) {
    let attempt = 0;

    while (true) {
      try {
        const resp = (await fetchQueue.add(() => requestWithPacing(url, options))) as Response;
        if (resp.status === 404) {
          return {};
        }
        if (resp.ok) {
          return readJsonResponse(resp, url);
        }

        const canRetry = network.retryStatuses.includes(resp.status) && attempt < network.maxRetries;
        if (!canRetry) {
          throw new Error(`Request failed (${resp.status}) for ${url}`);
        }

        const retryAfterMs = network.respectRetryAfter ? parseRetryAfterMs(resp.headers.get("retry-after")) : null;
        const retryDelayMs = retryAfterMs ?? calculateBackoffMs(attempt, network);
        await sleep(Math.min(network.maxDelayMs, retryDelayMs));
        attempt += 1;
      } catch (error) {
        if (attempt >= network.maxRetries || !isRetryableError(error)) {
          throw error;
        }
        const retryDelayMs = calculateBackoffMs(attempt, network);
        await sleep(retryDelayMs);
        attempt += 1;
      }
    }
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
          onProgress?.({
            type: "cache-hit",
            url,
            storeId: storeKey,
          });
          return data;
        }
      }

      if (inFlight.has(url)) {
        return inFlight.get(url);
      }

      onProgress?.({
        type: "queued",
        url,
        storeId: storeKey,
      });

      const requestPromise = (async () => {
        onProgress?.({
          type: "started",
          url,
          storeId: storeKey,
        });
        try {
          const data = await requestJson(url, options);
          cache.set(url, data as any);
          await writeCached(url, data);
          onProgress?.({
            type: "completed",
            url,
            storeId: storeKey,
          });
          return data;
        } catch (e) {
          onProgress?.({
            type: "failed",
            url,
            storeId: storeKey,
          });
          console.log("Error fetching", url, (e as any).message);
          console.error(e);
          throw e;
        }
      })();
      inFlight.set(url, requestPromise);

      try {
        return await requestPromise;
      } finally {
        inFlight.delete(url);
      }
    },
  };
}
