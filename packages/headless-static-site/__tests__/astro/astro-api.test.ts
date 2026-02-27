import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createIiifAstroClient } from "../../src/astro/client.ts";
import { createIiifAstroServer } from "../../src/astro/server.ts";

async function writeJson(path: string, value: unknown) {
  await writeFile(path, JSON.stringify(value, null, 2));
}

describe("astro server/client API", () => {
  let testDir = "";

  afterEach(async () => {
    vi.restoreAllMocks();
    if (testDir) {
      await rm(testDir, { recursive: true, force: true });
      testDir = "";
    }
  });

  test("server API generates static paths from sitemap and loads local manifest + meta", async () => {
    testDir = await mkdtemp(join(tmpdir(), "iiif-hss-astro-server-"));
    const buildDir = join(testDir, ".iiif", "build");
    await mkdir(join(buildDir, "meta"), { recursive: true });
    await mkdir(join(buildDir, "content", "demo"), { recursive: true });

    await writeJson(join(buildDir, "meta", "sitemap.json"), {
      "content/demo": {
        type: "Manifest",
        source: { type: "disk", path: "./content" },
      },
    });
    await writeJson(join(buildDir, "content", "demo", "manifest.json"), {
      id: "https://example.org/iiif/content/demo/manifest.json",
      type: "Manifest",
      label: { en: ["Demo"] },
      "hss:slug": "content/demo",
    });
    await writeJson(join(buildDir, "content", "demo", "meta.json"), {
      label: "Demo",
      totalItems: 1,
    });

    const api = createIiifAstroServer({ root: testDir });
    const staticPaths = await api.getManifestStaticPaths();
    const loaded = await api.loadManifestFromParams({ slug: "content/demo" });

    expect(staticPaths).toEqual([{ params: { slug: "content/demo" } }]);
    expect(loaded.type).toBe("Manifest");
    expect(loaded.resource?.label?.en?.[0]).toBe("Demo");
    expect(loaded.meta?.totalItems).toBe(1);
    expect(loaded.links.localJson).toBe("/content/demo/manifest.json");
  });

  test("server API falls back to remote manifest when local manifest is unavailable", async () => {
    testDir = await mkdtemp(join(tmpdir(), "iiif-hss-astro-server-remote-"));
    const buildDir = join(testDir, ".iiif", "build");
    await mkdir(join(buildDir, "meta"), { recursive: true });
    await mkdir(join(buildDir, "content", "remote-item"), { recursive: true });

    await writeJson(join(buildDir, "meta", "sitemap.json"), {
      "content/remote-item": {
        type: "Manifest",
        source: { type: "remote", url: "https://example.org/iiif/remote-item/manifest.json" },
      },
    });
    await writeJson(join(buildDir, "content", "remote-item", "meta.json"), {
      label: "Remote Item",
      totalItems: 5,
    });

    const fetchFn = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          id: "https://example.org/iiif/remote-item/manifest.json",
          type: "Manifest",
          label: { en: ["Remote Item"] },
        }),
        { status: 200 }
      );
    });

    const api = createIiifAstroServer({ root: testDir, fetchFn: fetchFn as any });
    const loaded = await api.loadManifest("content/remote-item");

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(loaded.type).toBe("Manifest");
    expect(loaded.resource?.label?.en?.[0]).toBe("Remote Item");
    expect(loaded.links.remoteJson).toBe("https://example.org/iiif/remote-item/manifest.json");
    expect(loaded.meta?.totalItems).toBe(5);
  });

  test("server API supports all-collection helpers and typed static path generation from collections", async () => {
    testDir = await mkdtemp(join(tmpdir(), "iiif-hss-astro-server-collections-"));
    const buildDir = join(testDir, ".iiif", "build");
    await mkdir(join(buildDir, "manifests"), { recursive: true });
    await mkdir(join(buildDir, "collections", "stores"), { recursive: true });
    await mkdir(join(buildDir, "manifests", "demo-1"), { recursive: true });

    await writeJson(join(buildDir, "manifests", "collection.json"), {
      id: "https://example.org/iiif/manifests/collection.json",
      type: "Collection",
      items: [
        {
          id: "https://example.org/iiif/manifests/demo-1/manifest.json",
          type: "Manifest",
          "hss:slug": "manifests/demo-1",
        },
        {
          id: "https://example.org/iiif/manifests/demo-2/manifest.json",
          type: "Manifest",
          "hss:slug": "manifests/demo-2",
        },
        {
          id: "https://example.org/iiif/collections/group-a/collection.json",
          type: "Collection",
          "hss:slug": "collections/group-a",
        },
      ],
    });
    await writeJson(join(buildDir, "collections", "collection.json"), {
      id: "https://example.org/iiif/collections/collection.json",
      type: "Collection",
      items: [{ id: "https://example.org/iiif/collections/group-a/collection.json", type: "Collection" }],
    });
    await writeJson(join(buildDir, "collections", "stores", "collection.json"), {
      id: "https://example.org/iiif/collections/stores/collection.json",
      type: "Collection",
      items: [{ id: "https://example.org/iiif/stores/demo-store/collection.json", type: "Collection" }],
    });
    await writeJson(join(buildDir, "manifests", "demo-1", "manifest.json"), {
      id: "https://example.org/iiif/manifests/demo-1/manifest.json",
      type: "Manifest",
      label: { en: ["Demo 1"] },
      "hss:slug": "manifests/demo-1",
    });
    await writeJson(join(buildDir, "manifests", "demo-1", "meta.json"), {
      label: "Demo 1",
      totalItems: 12,
    });

    const api = createIiifAstroServer({ root: testDir });
    const manifests = await api.getAllManifests();
    const collections = await api.getAllCollections();
    const storeCollections = await api.getAllStoreCollections();
    const manifestRoutePaths = api.getManifestStaticPathsFromCollection(manifests as any);
    const loaded = await api.loadManifestFromParams({ slug: "demo-1" });

    expect(manifests?.id).toContain("/manifests/collection.json");
    expect(collections?.id).toContain("/collections/collection.json");
    expect(storeCollections?.id).toContain("/collections/stores/collection.json");
    expect(manifestRoutePaths).toEqual([{ params: { slug: "demo-1" } }, { params: { slug: "demo-2" } }]);
    expect(loaded.slug).toBe("manifests/demo-1");
    expect(loaded.resource?.label?.en?.[0]).toBe("Demo 1");
    expect(loaded.meta?.totalItems).toBe(12);
  });

  test("server API supports custom route prefixes for static paths and params loading", async () => {
    testDir = await mkdtemp(join(tmpdir(), "iiif-hss-astro-server-custom-routes-"));
    const buildDir = join(testDir, ".iiif", "build");
    await mkdir(join(buildDir, "meta"), { recursive: true });
    await mkdir(join(buildDir, "manifests", "item-a"), { recursive: true });

    await writeJson(join(buildDir, "meta", "sitemap.json"), {
      "manifests/item-a": {
        type: "Manifest",
        source: { type: "disk", path: "./content" },
      },
    });
    await writeJson(join(buildDir, "manifests", "item-a", "manifest.json"), {
      id: "https://example.org/iiif/manifests/item-a/manifest.json",
      type: "Manifest",
      label: { en: ["Item A"] },
      "hss:slug": "manifests/item-a",
    });
    await writeJson(join(buildDir, "manifests", "item-a", "meta.json"), {
      label: "Item A",
      totalItems: 4,
    });

    const api = createIiifAstroServer({
      root: testDir,
      routes: {
        manifests: "objects",
        collections: "browser",
      },
    });
    const staticPaths = await api.getManifestStaticPaths();
    const loaded = await api.loadManifestFromParams({ slug: "item-a" });

    expect(staticPaths).toEqual([{ params: { slug: "item-a" } }]);
    expect(loaded.slug).toBe("manifests/item-a");
    expect(loaded.resource?.label?.en?.[0]).toBe("Item A");
    expect(loaded.meta?.totalItems).toBe(4);
  });

  test("server API getAll collections/manifests always return a collection object", async () => {
    testDir = await mkdtemp(join(tmpdir(), "iiif-hss-astro-server-empty-collections-"));
    const buildDir = join(testDir, ".iiif", "build");
    await mkdir(buildDir, { recursive: true });

    const api = createIiifAstroServer({ root: testDir });
    const manifests = await api.getAllManifests();
    const collections = await api.getAllCollections();
    const stores = await api.getAllStoreCollections();

    expect(manifests?.type).toBe("Collection");
    expect(Array.isArray(manifests?.items)).toBe(true);
    expect(collections?.type).toBe("Collection");
    expect(Array.isArray(collections?.items)).toBe(true);
    expect(stores?.type).toBe("Collection");
    expect(Array.isArray(stores?.items)).toBe(true);
  });

  test("client API resolves local manifest and params-based loading", async () => {
    const fetchFn = vi.fn(async (target: string) => {
      const url = String(target);
      if (url.endsWith("/meta/sitemap.json")) {
        return new Response(
          JSON.stringify({
            "content/local": {
              type: "Manifest",
              source: { type: "disk", path: "./content" },
            },
          }),
          { status: 200 }
        );
      }
      if (url.endsWith("/content/local/manifest.json")) {
        return new Response(
          JSON.stringify({
            id: "https://example.org/iiif/content/local/manifest.json",
            type: "Manifest",
            label: { en: ["Local Item"] },
          }),
          { status: 200 }
        );
      }
      if (url.endsWith("/content/local/meta.json")) {
        return new Response(JSON.stringify({ label: "Local Item", totalItems: 2 }), { status: 200 });
      }
      if (url.endsWith("/content/local/indices.json")) {
        return new Response(JSON.stringify({}), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    });

    const api = createIiifAstroClient({ baseUrl: "https://example.org", fetchFn: fetchFn as any });
    const loaded = await api.loadManifestFromParams({ slug: "content/local" });

    expect(loaded.type).toBe("Manifest");
    expect(loaded.resource?.label?.en?.[0]).toBe("Local Item");
    expect(loaded.meta?.totalItems).toBe(2);
    expect(loaded.links.localJson).toBe("https://example.org/content/local/manifest.json");
  });

  test("client API auto-resolves /iiif base path when baseUrl is omitted", async () => {
    const fetchFn = vi.fn(async (target: string) => {
      const url = String(target);
      if (url.endsWith("/iiif/meta/sitemap.json")) {
        return new Response(
          JSON.stringify({
            "api/cookbook/recipe/0001-mvm-image": {
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
      return new Response("Not found", { status: 404 });
    });

    const api = createIiifAstroClient({ fetchFn: fetchFn as any, cache: false });
    const loaded = await api.loadManifest("api/cookbook/recipe/0001-mvm-image");

    expect(loaded.type).toBe("Manifest");
    expect(loaded.resource?.label?.en?.[0]).toBe("Cookbook");
    expect(loaded.links.localJson).toBe(null);
    expect(loaded.links.remoteJson).toBe("https://theseusviewer.org/api/cookbook/recipe/0001-mvm-image/manifest.json");
    expect(fetchFn.mock.calls.some(([target]) => String(target).includes("/iiif/meta/sitemap.json"))).toBe(true);
    expect(
      fetchFn.mock.calls.some(([target]) =>
        String(target).includes("/iiif/api/cookbook/recipe/0001-mvm-image/manifest.json")
      )
    ).toBe(false);
  });

  test("client API loads local meta/indices for remote sitemap resources", async () => {
    const fetchFn = vi.fn(async (target: string) => {
      const url = String(target);
      if (url.endsWith("/iiif/meta/sitemap.json")) {
        return new Response(
          JSON.stringify({
            "api/cookbook/recipe/0001-mvm-image": {
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
      if (url.endsWith("/iiif/api/cookbook/recipe/0001-mvm-image/meta.json")) {
        return new Response(JSON.stringify({ totalItems: 4 }), { status: 200 });
      }
      if (url.endsWith("/iiif/api/cookbook/recipe/0001-mvm-image/indices.json")) {
        return new Response(JSON.stringify({ pages: 1 }), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    });

    const api = createIiifAstroClient({ fetchFn: fetchFn as any, cache: false });
    const loaded = await api.loadManifest("api/cookbook/recipe/0001-mvm-image");

    expect(loaded.type).toBe("Manifest");
    expect(loaded.links.localJson).toBe(null);
    expect(loaded.links.remoteJson).toBe("https://theseusviewer.org/api/cookbook/recipe/0001-mvm-image/manifest.json");
    expect(loaded.meta?.totalItems).toBe(4);
    expect(loaded.indices?.pages).toBe(1);
  });

  test("client API supports all-collection helpers and typed static paths from collections", async () => {
    const fetchFn = vi.fn(async (target: string) => {
      const url = String(target);
      if (url.endsWith("/iiif/manifests/collection.json")) {
        return new Response(
          JSON.stringify({
            id: "https://example.org/iiif/manifests/collection.json",
            type: "Collection",
            items: [
              {
                id: "https://example.org/iiif/manifests/item-a/manifest.json",
                type: "Manifest",
                "hss:slug": "manifests/item-a",
              },
              {
                id: "https://example.org/iiif/manifests/item-b/manifest.json",
                type: "Manifest",
                "hss:slug": "manifests/item-b",
              },
              {
                id: "https://example.org/iiif/collections/group-a/collection.json",
                type: "Collection",
                "hss:slug": "collections/group-a",
              },
            ],
          }),
          { status: 200 }
        );
      }
      if (url.endsWith("/iiif/collections/collection.json")) {
        return new Response(
          JSON.stringify({
            id: "https://example.org/iiif/collections/collection.json",
            type: "Collection",
            items: [],
          }),
          { status: 200 }
        );
      }
      if (url.endsWith("/iiif/collections/stores/collection.json")) {
        return new Response(
          JSON.stringify({
            id: "https://example.org/iiif/collections/stores/collection.json",
            type: "Collection",
            items: [],
          }),
          { status: 200 }
        );
      }
      return new Response("Not found", { status: 404 });
    });

    const api = createIiifAstroClient({ fetchFn: fetchFn as any, cache: false });
    const manifests = await api.getAllManifests();
    const collections = await api.getAllCollections();
    const storeCollections = await api.getAllStoreCollections();
    const staticPaths = api.getManifestStaticPathsFromCollection(manifests as any);

    expect(manifests?.id).toContain("/manifests/collection.json");
    expect(collections?.id).toContain("/collections/collection.json");
    expect(storeCollections?.id).toContain("/collections/stores/collection.json");
    expect(staticPaths).toEqual([{ params: { slug: "item-a" } }, { params: { slug: "item-b" } }]);
  });

  test("client API resolves manifest from stripped route params when sitemap slug is prefixed", async () => {
    const fetchFn = vi.fn(async (target: string) => {
      const url = String(target);
      if (url.endsWith("/iiif/meta/sitemap.json")) {
        return new Response(
          JSON.stringify({
            "manifests/item-a": {
              type: "Manifest",
              source: { type: "disk", path: "./content" },
            },
          }),
          { status: 200 }
        );
      }
      if (url.endsWith("/iiif/manifests/item-a/manifest.json")) {
        return new Response(
          JSON.stringify({
            id: "https://example.org/iiif/manifests/item-a/manifest.json",
            type: "Manifest",
            label: { en: ["Item A"] },
          }),
          { status: 200 }
        );
      }
      if (url.endsWith("/iiif/manifests/item-a/meta.json")) {
        return new Response(JSON.stringify({ totalItems: 3 }), { status: 200 });
      }
      if (url.endsWith("/iiif/manifests/item-a/indices.json")) {
        return new Response(JSON.stringify({}), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    });

    const api = createIiifAstroClient({ fetchFn: fetchFn as any, cache: false });
    const loaded = await api.loadManifestFromParams({ slug: "item-a" });

    expect(loaded.slug).toBe("manifests/item-a");
    expect(loaded.resource?.label?.en?.[0]).toBe("Item A");
    expect(loaded.meta?.totalItems).toBe(3);
    expect(loaded.links.localJson).toContain("/iiif/manifests/item-a/manifest.json");
  });

  test("client API supports custom route prefixes for static paths and params loading", async () => {
    const fetchFn = vi.fn(async (target: string) => {
      const url = String(target);
      if (url.endsWith("/iiif/meta/sitemap.json")) {
        return new Response(
          JSON.stringify({
            "manifests/item-a": {
              type: "Manifest",
              source: { type: "disk", path: "./content" },
            },
          }),
          { status: 200 }
        );
      }
      if (url.endsWith("/iiif/manifests/item-a/manifest.json")) {
        return new Response(
          JSON.stringify({
            id: "https://example.org/iiif/manifests/item-a/manifest.json",
            type: "Manifest",
            label: { en: ["Item A"] },
          }),
          { status: 200 }
        );
      }
      if (url.endsWith("/iiif/manifests/item-a/meta.json")) {
        return new Response(JSON.stringify({ totalItems: 3 }), { status: 200 });
      }
      if (url.endsWith("/iiif/manifests/item-a/indices.json")) {
        return new Response(JSON.stringify({}), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    });

    const api = createIiifAstroClient({
      fetchFn: fetchFn as any,
      cache: false,
      routes: {
        manifests: "objects",
        collections: "browser",
      },
    });
    const staticPaths = await api.getManifestStaticPaths();
    const loaded = await api.loadManifestFromParams({ slug: "item-a" });

    expect(staticPaths).toEqual([{ params: { slug: "item-a" } }]);
    expect(loaded.slug).toBe("manifests/item-a");
    expect(loaded.resource?.label?.en?.[0]).toBe("Item A");
    expect(loaded.meta?.totalItems).toBe(3);
  });

  test("client API getAll collections/manifests always return a collection object", async () => {
    const fetchFn = vi.fn(async () => new Response("Not found", { status: 404 }));
    const api = createIiifAstroClient({ fetchFn: fetchFn as any, cache: false });

    const manifests = await api.getAllManifests();
    const collections = await api.getAllCollections();
    const stores = await api.getAllStoreCollections();

    expect(manifests?.type).toBe("Collection");
    expect(Array.isArray(manifests?.items)).toBe(true);
    expect(collections?.type).toBe("Collection");
    expect(Array.isArray(collections?.items)).toBe(true);
    expect(stores?.type).toBe("Collection");
    expect(Array.isArray(stores?.items)).toBe(true);
  });
});
