import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { warmRemoteStores } from "../../src/commands/build-steps/-1-warm-remote.ts";

function mockJsonResponse(data: any, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get() {
        return null;
      },
    },
    async text() {
      return JSON.stringify(data);
    },
  } as any;
}

describe("warm remote stores", () => {
  let requestCacheDir = "";

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (requestCacheDir) {
      await rm(requestCacheDir, { recursive: true, force: true });
      requestCacheDir = "";
    }
  });

  test("recursively warms nested collection resources", async () => {
    requestCacheDir = await mkdtemp(join(tmpdir(), "iiif-hss-warm-"));
    const rootUrl = "https://example.org/collection.json";
    const nextPageUrl = "https://example.org/collection/page/2.json";
    const manifestUrl = "https://example.org/manifest.json";
    const manifestUrl2 = "https://example.org/manifest-2.json";

    const fetchMock = vi.fn(async (url: string) => {
      if (url === rootUrl) {
        return mockJsonResponse({
          id: rootUrl,
          type: "Collection",
          items: [{ id: manifestUrl, type: "Manifest" }],
          next: {
            id: nextPageUrl,
            type: "CollectionPage",
          },
        });
      }

      if (url === nextPageUrl) {
        return mockJsonResponse({
          id: nextPageUrl,
          type: "CollectionPage",
          items: [{ id: manifestUrl2, type: "Manifest" }],
        });
      }

      return mockJsonResponse({
        id: url,
        type: "Manifest",
      });
    });

    vi.stubGlobal("fetch", fetchMock as any);

    const buildConfig: any = {
      stores: ["remote"],
      config: {
        stores: {
          remote: {
            type: "iiif-remote",
            url: rootUrl,
          },
        },
      },
      requestCacheDir,
      options: {
        cache: true,
      },
      network: {
        prefetch: true,
        concurrency: 2,
        minDelayMs: 0,
        maxRetries: 1,
        baseDelayMs: 1,
        maxDelayMs: 2,
        jitterRatio: 0,
        retryStatuses: [429],
        respectRetryAfter: true,
      },
      log: () => undefined,
    };

    const stats = await warmRemoteStores(buildConfig, { storeRequestCaches: {} });

    expect(stats.stores).toBe(1);
    expect(stats.urls).toBe(3);
    expect(stats.failures).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
