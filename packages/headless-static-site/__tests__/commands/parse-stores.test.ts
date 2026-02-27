import { describe, expect, test } from "vitest";
import { parseStores } from "../../src/commands/build-steps/0-parse-stores.ts";
import { loadStores } from "../../src/commands/build-steps/1-load-stores.ts";

function createFilesMock() {
  const jsonData = new Map<string, any>();
  return {
    async loadJson(path: string) {
      return jsonData.get(path) || {};
    },
    async mkdir(_path: string) {
      return;
    },
    async saveJson(path: string, data: any) {
      jsonData.set(path, data);
    },
  };
}

function createBuildConfig() {
  const files = createFilesMock();
  const storeType = {
    async parse(_storeConfig: any, { storeId }: { storeId: string }) {
      return [
        {
          type: "Manifest",
          path: `${storeId}/manifest.json`,
          slug: `manifests/${storeId}`,
          storeId,
          saveToDisk: true,
          source: {
            type: "remote",
            url: `https://example.org/${storeId}/manifest.json`,
          },
        },
      ];
    },
    async invalidate() {
      return true;
    },
    async load(_storeConfig: any, resource: any) {
      return {
        "resource.json": {
          id: `https://example.org/${resource.slug}`,
          type: resource.type,
          path: resource.path,
          slug: resource.slug,
          storeId: resource.storeId,
          saveToDisk: true,
          source: resource.source,
        },
        "vault.json": {},
        "meta.json": {},
        "caches.json": {},
        "indices.json": {},
      };
    },
  };

  return {
    config: {
      stores: {
        primary: {
          type: "iiif-json",
          path: "./content",
        },
      },
      generators: {
        generated: {},
      },
    },
    stores: ["primary"],
    options: {
      cache: false,
      ui: false,
    },
    requestCacheDir: "/tmp/iiif-request-cache",
    cacheDir: "/tmp/iiif-cache",
    storeTypes: {
      "iiif-json": storeType,
    },
    slugs: {},
    manifestRewrites: [],
    collectionRewrites: [],
    files,
    log: () => undefined,
    canvasExtractions: [],
    canvasEnrichment: [],
  };
}

describe("parseStores generated store handling", () => {
  test("derives generator stores without mutating build config", async () => {
    const buildConfig: any = createBuildConfig();

    const first = await parseStores(buildConfig, { storeRequestCaches: {} });
    const second = await parseStores(buildConfig, { storeRequestCaches: {} });

    expect(first.storeIds).toEqual(["primary", "generated"]);
    expect(first.storeConfigs.generated.type).toBe("iiif-json");
    expect(first.storeConfigs.generated.path.endsWith("/generated/build")).toBe(true);
    expect(second.storeIds.filter((storeId: string) => storeId === "generated")).toHaveLength(1);

    expect(buildConfig.stores).toEqual(["primary"]);
    expect(buildConfig.config.stores.generated).toBeUndefined();
  });

  test("loadStores can process derived generator stores", async () => {
    const buildConfig: any = createBuildConfig();
    const parsed = await parseStores(buildConfig, { storeRequestCaches: {} });
    const loaded = await loadStores(parsed, buildConfig);

    expect(loaded.allResources).toHaveLength(2);
    expect(loaded.allResources.map((resource) => resource.storeId).sort()).toEqual(["generated", "primary"]);
    expect(buildConfig.config.stores.generated).toBeUndefined();
  });

  test("publishes early resource estimates for remote store roots", async () => {
    const buildConfig: any = createBuildConfig();
    buildConfig.config.generators = undefined;
    buildConfig.config.stores = {
      remote: {
        type: "iiif-remote",
        urls: ["https://example.org/collections/a.json", "https://example.org/collections/b.json"],
      },
    };
    buildConfig.stores = ["remote"];
    buildConfig.storeTypes["iiif-remote"] = {
      async parse(_storeConfig: any, api: any) {
        api.reportEstimatedResources?.(3);
        return [];
      },
      async invalidate() {
        return true;
      },
      async load() {
        return null;
      },
    };

    const estimates: number[] = [];
    await parseStores(buildConfig, { storeRequestCaches: {} }, undefined, {
      onResourcesDiscovered({ total }) {
        estimates.push(total);
      },
    });

    expect(estimates.some((total) => total >= 2)).toBe(true);
    expect(estimates.some((total) => total >= 5)).toBe(true);
  });
});
