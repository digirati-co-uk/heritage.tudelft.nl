import { describe, expect, test, vi } from "vitest";
import { IIIFRemoteStore } from "../../src/stores/iiif-remote";

describe("IIIFRemoteStore.parse", () => {
  test("follows paged collection links and returns all manifests", async () => {
    const rootUrl = "https://example.org/collection.json";
    const nextPageUrl = "https://example.org/collection/page/2.json";
    const manifestUrl1 = "https://example.org/manifest-1.json";
    const manifestUrl2 = "https://example.org/manifest-2.json";

    const responses: Record<string, any> = {
      [rootUrl]: {
        id: rootUrl,
        type: "Collection",
        items: [{ id: manifestUrl1, type: "Manifest" }],
        next: { id: nextPageUrl, type: "CollectionPage" },
      },
      [nextPageUrl]: {
        id: nextPageUrl,
        type: "CollectionPage",
        items: [{ id: manifestUrl2, type: "Manifest" }],
      },
      [manifestUrl1]: { id: manifestUrl1, type: "Manifest" },
      [manifestUrl2]: { id: manifestUrl2, type: "Manifest" },
    };

    const fetchMock = vi.fn(async (url: string) => responses[url]);

    const resources = await IIIFRemoteStore.parse(
      {
        type: "iiif-remote",
        url: rootUrl,
      },
      {
        storeId: "remote",
        requestCache: {
          fetch: fetchMock,
          didChange: async () => true,
          getKey: async () => null,
        },
        getSlug: ({ id, type }: { id: string; type: string }) => {
          const suffix = id.split("/").pop() || "resource";
          return [type === "Collection" ? `collections/${suffix}` : `manifests/${suffix}`, "test-slug"];
        },
        files: {} as any,
        build: {
          log: () => undefined,
        } as any,
      } as any
    );

    expect(resources).toHaveLength(3);
    expect(resources.filter((resource) => resource.type === "Collection")).toHaveLength(1);
    expect(resources.filter((resource) => resource.type === "Manifest")).toHaveLength(2);
    expect(resources.map((resource) => resource.path)).toEqual(expect.arrayContaining([manifestUrl1, manifestUrl2]));
  });
});
