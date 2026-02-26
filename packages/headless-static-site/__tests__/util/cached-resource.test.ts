import { Vault } from "@iiif/helpers";
import { describe, expect, test } from "vitest";
import { createCacheResource } from "../../src/util/cached-resource";

function createFileHandlerMock() {
  const savedFiles: string[] = [];
  const jsonFiles = new Set<string>();
  return {
    savedFiles,
    exists: (path: string) => jsonFiles.has(path),
    openJson: async () => ({}),
    loadJson: async () => ({}),
    saveJson: async (path: string) => {
      jsonFiles.add(path);
      savedFiles.push(path);
    },
    mkdir: async () => undefined,
  };
}

describe("createCacheResource", () => {
  test("tracks didChange per resource instance", async () => {
    const fileHandler = createFileHandlerMock();
    const temp = {};
    const collections = {};

    const first = createCacheResource({
      resourcePath: "/tmp/resource-a",
      resource: {
        id: "https://example.org/resource-a",
        slug: "resource-a",
        vault: new Vault(),
      },
      temp,
      collections,
      fileHandler: fileHandler as any,
    });
    const second = createCacheResource({
      resourcePath: "/tmp/resource-b",
      resource: {
        id: "https://example.org/resource-b",
        slug: "resource-b",
        vault: new Vault(),
      },
      temp,
      collections,
      fileHandler: fileHandler as any,
    });

    first.handleResponse({ didChange: true }, { id: "first-step" });

    await first.saveVault();
    await second.saveVault();

    expect(fileHandler.savedFiles).toEqual(["/tmp/resource-a/vault.json"]);
  });

  test("exposes pending meta updates and syncs search record fields", async () => {
    const fileHandler = createFileHandlerMock();
    const cached = createCacheResource({
      resourcePath: "/tmp/resource-c",
      resource: {
        id: "https://example.org/resource-c",
        slug: "resource-c",
        vault: new Vault(),
      },
      temp: {},
      collections: {},
      fileHandler: fileHandler as any,
    });

    cached.handleResponse({ meta: { totalItems: 1 } }, { id: "extract-slug-source" });
    await expect(cached.meta.value).resolves.toMatchObject({ totalItems: 1 });

    cached.handleResponse(
      {
        search: {
          indexes: ["manifests"],
          record: {
            id: "resource-c",
            collections: [],
          },
        },
      },
      { id: "extract-search-record" }
    );
    cached.handleResponse(
      {
        meta: {
          thumbnail: { id: "https://example.org/thumb.jpg" },
          partOfCollections: [{ slug: "collections/root" }],
          totalItems: 7,
        },
      },
      { id: "extract-part-of-collection" }
    );

    await expect(cached.searchRecord.value).resolves.toMatchObject({
      record: {
        id: "resource-c",
        thumbnail: "https://example.org/thumb.jpg",
        collections: ["collections/root"],
        totalItems: 7,
      },
    });
  });
});
