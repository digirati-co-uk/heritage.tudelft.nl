import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chdir, cwd } from "node:process";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createServer } from "../../src/create-server.ts";

describe("debug UI routes", () => {
  const originalCwd = cwd();
  let testDir = "";

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "iiif-hss-debug-routes-"));
    chdir(testDir);
    const baseDir = cwd();
    await mkdir(join(baseDir, ".iiif", "build", "meta"), { recursive: true });
    await mkdir(join(baseDir, ".iiif", "build"), { recursive: true });
    await mkdir(join(baseDir, ".iiif", "build", "manifests", "demo"), { recursive: true });
    await mkdir(join(baseDir, ".iiif", "cache", "manifests", "demo"), { recursive: true });
    await mkdir(join(baseDir, "build", "dev-ui", "assets"), { recursive: true });

    await writeFile(
      join(baseDir, ".iiif", "build", "meta", "sitemap.json"),
      JSON.stringify(
        {
          "manifests/demo": {
            type: "Manifest",
            label: "Demo manifest",
            source: {
              type: "disk",
              path: "content/demo.json",
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      join(baseDir, ".iiif", "build", "collection.json"),
      JSON.stringify(
        {
          id: "http://localhost:7111/collections/collection.json",
          type: "Collection",
          items: [
            {
              id: "http://localhost:7111/manifests/demo/manifest.json",
              type: "Manifest",
              label: { en: ["Demo manifest"] },
              thumbnail: [{ id: "https://example.org/thumb.jpg" }],
              "hss:slug": "manifests/demo",
            },
          ],
        },
        null,
        2
      )
    );
    await writeFile(
      join(baseDir, ".iiif", "build", "manifests", "demo", "manifest.json"),
      JSON.stringify(
        {
          id: "http://localhost:7111/manifests/demo/manifest.json",
          type: "Manifest",
          label: { en: ["Demo manifest"] },
          items: [],
        },
        null,
        2
      )
    );
    await writeFile(
      join(baseDir, ".iiif", "cache", "manifests", "demo", "meta.json"),
      JSON.stringify({ a: 1 }, null, 2)
    );
    await writeFile(
      join(baseDir, ".iiif", "cache", "manifests", "demo", "indices.json"),
      JSON.stringify({ topics: ["alpha"] }, null, 2)
    );
    await writeFile(
      join(baseDir, "build", "dev-ui", "index.html"),
      `<!doctype html><html><body><script src="./assets/app.js"></script></body></html>`
    );
    await writeFile(join(baseDir, "build", "dev-ui", "assets", "app.js"), "console.log('ok');");
  });

  afterEach(async () => {
    chdir(originalCwd);
    if (testDir) {
      await rm(testDir, { recursive: true, force: true });
      testDir = "";
    }
  });

  test("exposes site and resource debug endpoints", async () => {
    const server = await createServer({
      server: { url: "http://localhost:7111" },
      stores: {
        default: {
          type: "iiif-json",
          path: "./content",
        },
      },
    });

    const siteRes = await server.request("/_debug/api/site");
    expect(siteRes.status).toBe(200);
    const siteJson = await siteRes.json();
    expect(siteJson.featuredItems).toHaveLength(1);
    expect(siteJson.featuredItems[0].slug).toBe("manifests/demo");

    const resourceRes = await server.request("/_debug/api/resource/manifests/demo");
    expect(resourceRes.status).toBe(200);
    const resourceJson = await resourceRes.json();
    expect(resourceJson.type).toBe("Manifest");
    expect(resourceJson.meta.a).toBe(1);
    expect(resourceJson.indices.topics).toEqual(["alpha"]);
    expect(resourceJson.links.manifestEditor).toContain("manifest-editor");
  });

  test("uses forwarded base path for debug redirects and asset rewrites", async () => {
    const server = await createServer({
      server: { url: "http://localhost:7111" },
      stores: {
        default: {
          type: "iiif-json",
          path: "./content",
        },
      },
    });

    const redirectRes = await server.request("/_debug", {
      headers: {
        "x-hss-base-path": "/iiif",
      },
      redirect: "manual",
    });
    expect(redirectRes.status).toBe(302);
    expect(redirectRes.headers.get("location")).toBe("/iiif/_debug/");

    const htmlRes = await server.request("/_debug/manifests/demo", {
      headers: {
        "x-hss-base-path": "/iiif",
      },
    });
    expect(htmlRes.status).toBe(200);
    const html = await htmlRes.text();
    expect(html).toContain("/iiif/_debug/assets/app.js");
  });
});
