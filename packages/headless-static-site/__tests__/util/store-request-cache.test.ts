import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createStoreRequestCache } from "../../src/util/store-request-cache";

function mockJsonResponse(data: any, status = 200) {
  return {
    status,
    async json() {
      return data;
    },
  };
}

function getCachePath(cacheDir: string, storeKey: string, url: string) {
  const hash = createHash("sha256").update(url).digest("hex");
  return join(cacheDir, `${storeKey}/${hash}.json`);
}

describe("store request cache", () => {
  let cacheDir = "";

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (cacheDir) {
      await rm(cacheDir, { recursive: true, force: true });
      cacheDir = "";
    }
  });

  test("uses a stable URL cache key in memory and on disk", async () => {
    cacheDir = await mkdtemp(join(tmpdir(), "iiif-hss-request-cache-"));
    const url = "https://example.org/manifest.json";
    const fetchMock = vi.fn(async () => mockJsonResponse({ value: 1 }));
    vi.stubGlobal("fetch", fetchMock as any);

    const firstCache = createStoreRequestCache("store", cacheDir, false);
    expect(await firstCache.fetch(url)).toEqual({ value: 1 });
    expect(await firstCache.fetch(url)).toEqual({ value: 1 });
    expect(await firstCache.getKey(url)).toBe(url);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const secondCache = createStoreRequestCache("store", cacheDir, false);
    expect(await secondCache.getKey(url)).toBe(url);
    expect(await secondCache.fetch(url)).toEqual({ value: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("didChange compares against cached payload and stages updated data", async () => {
    cacheDir = await mkdtemp(join(tmpdir(), "iiif-hss-request-cache-"));
    const url = "https://example.org/changed.json";
    const responses = [{ value: 1 }, { value: 1 }, { value: 2 }];
    const fetchMock = vi.fn(async () => mockJsonResponse(responses.shift() || { value: 2 }));
    vi.stubGlobal("fetch", fetchMock as any);

    const cache = createStoreRequestCache("store", cacheDir, false);
    expect(await cache.fetch(url)).toEqual({ value: 1 });
    expect(await cache.didChange(url)).toBe(false);
    expect(await cache.didChange(url)).toBe(true);
    expect(await cache.fetch(url)).toEqual({ value: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("no-cache mode ignores existing disk cache entries", async () => {
    cacheDir = await mkdtemp(join(tmpdir(), "iiif-hss-request-cache-"));
    const storeKey = "store";
    const url = "https://example.org/no-cache.json";
    const cachePath = getCachePath(cacheDir, storeKey, url);
    await mkdir(dirname(cachePath), { recursive: true });
    await writeFile(cachePath, JSON.stringify({ value: "stale" }));

    const fetchMock = vi.fn(async () => mockJsonResponse({ value: "fresh" }));
    vi.stubGlobal("fetch", fetchMock as any);

    const cache = createStoreRequestCache(storeKey, cacheDir, true);
    expect(await cache.fetch(url)).toEqual({ value: "fresh" });
    expect(await cache.fetch(url)).toEqual({ value: "fresh" });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const diskData = JSON.parse((await readFile(cachePath)).toString("utf-8"));
    expect(diskData).toEqual({ value: "stale" });
  });
});
