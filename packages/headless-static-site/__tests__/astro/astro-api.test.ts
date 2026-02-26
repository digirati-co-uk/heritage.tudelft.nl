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
      fetchFn.mock.calls.some(([target]) => String(target).includes("/iiif/api/cookbook/recipe/0001-mvm-image"))
    ).toBe(false);
  });
});
