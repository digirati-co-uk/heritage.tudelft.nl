import { describe, expect, test, vi } from "vitest";
import { createIiifViteClient } from "../src/vite/client.ts";

describe("vite client helpers", () => {
  test("re-uses static path helpers for manifests collections", async () => {
    const fetchFn = vi.fn(async (target: string) => {
      const url = String(target);
      if (url.endsWith("/manifests/collection.json")) {
        return new Response(
          JSON.stringify({
            id: "https://example.org/iiif/manifests/collection.json",
            type: "Collection",
            items: [
              {
                id: "https://example.org/iiif/manifests/demo-item/manifest.json",
                type: "Manifest",
                "hss:slug": "manifests/demo-item",
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response("Not found", { status: 404 });
    });

    const iiif = createIiifViteClient({
      baseUrl: "https://example.org/iiif",
      fetchFn: fetchFn as any,
      cache: false,
    });

    const manifests = await iiif.getAllManifests();
    const paths = iiif.getManifestStaticPathsFromCollection(manifests as any);

    expect(paths).toEqual([{ params: { slug: "demo-item" } }]);
  });

  test("loads local manifest resources using route candidate helpers", async () => {
    const fetchFn = vi.fn(async (target: string) => {
      const url = String(target);
      if (url.endsWith("/manifests/demo-item/manifest.json")) {
        return new Response(
          JSON.stringify({
            id: "https://example.org/iiif/manifests/demo-item/manifest.json",
            type: "Manifest",
            label: { en: ["Demo item"] },
          }),
          { status: 200 }
        );
      }
      if (url.endsWith("/manifests/demo-item/meta.json")) {
        return new Response(
          JSON.stringify({
            totalItems: 7,
            "hss:runtime": {
              type: "Manifest",
              source: { type: "disk", path: "./content", filePath: "content/demo-item.json" },
            },
          }),
          { status: 200 }
        );
      }
      if (url.endsWith("/manifests/demo-item/indices.json")) {
        return new Response(JSON.stringify({}), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    });

    const iiif = createIiifViteClient({
      baseUrl: "https://example.org/iiif",
      fetchFn: fetchFn as any,
      cache: false,
    });

    const loaded = await iiif.loadManifest("demo-item");

    expect(loaded.slug).toBe("manifests/demo-item");
    expect(loaded.type).toBe("Manifest");
    expect(loaded.resource?.label?.en?.[0]).toBe("Demo item");
    expect(loaded.meta?.totalItems).toBe(7);
    expect(loaded.links.localJson).toBe("https://example.org/iiif/manifests/demo-item/manifest.json");
  });

  test("loads local meta/indices for remote runtime hints", async () => {
    const fetchFn = vi.fn(async (target: string) => {
      const url = String(target);
      if (url === "https://theseusviewer.org/api/cookbook/recipe/0001-mvm-image/manifest.json") {
        return new Response(
          JSON.stringify({
            id: "https://theseusviewer.org/api/cookbook/recipe/0001-mvm-image/manifest.json",
            type: "Manifest",
            label: { en: ["Cookbook"] },
          }),
          { status: 200 }
        );
      }
      if (url.endsWith("/api/cookbook/recipe/0001-mvm-image/meta.json")) {
        return new Response(
          JSON.stringify({
            totalItems: 4,
            "hss:runtime": {
              type: "Manifest",
              source: {
                type: "remote",
                url: "https://theseusviewer.org/api/cookbook/recipe/0001-mvm-image/manifest.json",
              },
            },
          }),
          { status: 200 }
        );
      }
      if (url.endsWith("/api/cookbook/recipe/0001-mvm-image/indices.json")) {
        return new Response(JSON.stringify({ pages: 1 }), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    });

    const iiif = createIiifViteClient({
      baseUrl: "https://example.org/iiif",
      fetchFn: fetchFn as any,
      cache: false,
    });

    const loaded = await iiif.loadManifest("api/cookbook/recipe/0001-mvm-image");

    expect(loaded.links.localJson).toBe(null);
    expect(loaded.links.remoteJson).toBe("https://theseusviewer.org/api/cookbook/recipe/0001-mvm-image/manifest.json");
    expect(loaded.meta?.totalItems).toBe(4);
    expect(loaded.indices?.pages).toBe(1);
    expect(
      fetchFn.mock.calls.some(([target]) =>
        String(target).includes("/iiif/api/cookbook/recipe/0001-mvm-image/manifest.json")
      )
    ).toBe(false);
  });
});
