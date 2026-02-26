import { mkdir, mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chdir, cwd } from "node:process";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createServer } from "../../src/create-server.ts";
import { findDebugUiDir } from "../../src/server/debug-ui-routes.ts";

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
    await mkdir(join(baseDir, "content"), { recursive: true });

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
      join(baseDir, ".iiif", "build", "meta", "metadata-analysis.json"),
      JSON.stringify(
        {
          foundKeys: {
            Year: 4,
            Contributor: 3,
            Contributors: 2,
          },
          foundValues: {},
          foundValuesComma: {},
          foundLanguages: {
            en: 4,
          },
          foundUniqueKeys: ["Year", "Contributor", "Contributors"],
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
    expect(siteJson.topics.available).toBe(false);

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

    const rootRedirectRes = await server.request("/", {
      headers: {
        "x-hss-base-path": "/iiif",
      },
      redirect: "manual",
    });
    expect(rootRedirectRes.status).toBe(302);
    expect(rootRedirectRes.headers.get("location")).toBe("/iiif/_debug/");
  });

  test("exposes build status and onboarding metadata", async () => {
    const server = await createServer(
      {
        server: { url: "http://localhost:7111" },
        stores: {
          default: {
            type: "iiif-json",
            path: "./content",
          },
        },
      },
      {
        onboarding: {
          enabled: true,
          configMode: "default",
          contentFolder: "./content",
          hints: {
            addContent: "Add IIIF JSON files into ./content",
          },
        },
      }
    );

    const statusRes = await server.request("/_debug/api/status");
    expect(statusRes.status).toBe(200);
    const statusJson = await statusRes.json();
    expect(statusJson.build.status).toBe("idle");
    expect(statusJson.onboarding.enabled).toBe(true);
    expect(statusJson.onboarding.contentFolder).toBe("./content");

    const siteRes = await server.request("/_debug/api/site");
    const siteJson = await siteRes.json();
    expect(siteJson.build.status).toBe("idle");
    expect(siteJson.onboarding.enabled).toBe(true);
  });

  test("exposes metadata analysis and current extract-topics config", async () => {
    const server = await createServer({
      server: { url: "http://localhost:7111" },
      run: ["extract-topics"],
      config: {
        "extract-topics": {
          topicTypes: {
            date: ["Year"],
          },
        },
      },
      stores: {
        default: {
          type: "iiif-json",
          path: "./content",
        },
      },
    });

    const response = await server.request("/_debug/api/metadata-analysis");
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.analysis?.foundKeys?.Year).toBe(4);
    expect(json.extractTopicsConfig?.topicTypes?.date).toEqual(["Year"]);
    expect(json.outputPath.endsWith("/iiif-config/config/extract-topics.json")).toBe(true);
    expect(json.warnings).toEqual([]);
  });

  test("creates extract-topics config from metadata endpoint and triggers full rebuild", async () => {
    const server = await createServer({
      server: { url: "http://localhost:7111" },
      stores: {
        default: {
          type: "iiif-json",
          path: "./content",
        },
      },
    });

    const createResponse = await server.request("/_debug/api/metadata-analysis/create-collection", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        topicTypes: {
          contributor: ["Contributor", "Contributors"],
          date: ["Year"],
        },
        mode: "merge",
      }),
    });

    expect(createResponse.status).toBe(200);
    const createJson = await createResponse.json();
    expect(createJson.saved).toBe(true);
    expect(createJson.extractTopicsConfig.topicTypes).toEqual({
      contributor: ["Contributor", "Contributors"],
      date: ["Year"],
    });
    expect(createJson.rebuild).toEqual({
      triggered: true,
      mode: "full",
      ok: true,
      error: null,
    });
    expect(createJson.warnings).toEqual([]);

    const persisted = JSON.parse(await readFile(join(cwd(), "iiif-config", "config", "extract-topics.json"), "utf-8"));
    expect(persisted.topicTypes).toEqual({
      contributor: ["Contributor", "Contributors"],
      date: ["Year"],
    });
  });

  test("merges existing extract-topics config when saving metadata topic groups", async () => {
    await mkdir(join(cwd(), "iiif-config", "config"), { recursive: true });
    await writeFile(
      join(cwd(), "iiif-config", "config", "extract-topics.json"),
      JSON.stringify(
        {
          language: "en",
          topicTypes: {
            date: ["Year"],
          },
        },
        null,
        2
      )
    );

    const server = await createServer({
      server: { url: "http://localhost:7111" },
      run: ["extract-topics"],
      stores: {
        default: {
          type: "iiif-json",
          path: "./content",
        },
      },
    });

    const response = await server.request("/_debug/api/metadata-analysis/create-collection", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        topicTypes: {
          contributor: ["Contributor"],
        },
      }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.extractTopicsConfig).toEqual({
      language: "en",
      topicTypes: {
        date: ["Year"],
        contributor: ["Contributor"],
      },
    });
  });

  test("includes top-level topics collection summary in site response", async () => {
    await mkdir(join(cwd(), ".iiif", "build", "topics"), { recursive: true });
    await writeFile(
      join(cwd(), ".iiif", "build", "topics", "collection.json"),
      JSON.stringify(
        {
          id: "http://localhost:7111/topics/collection.json",
          type: "Collection",
          label: { en: ["Topics"] },
          items: [
            {
              id: "http://localhost:7111/topics/date/collection.json",
              type: "Collection",
              "hss:slug": "topics/date",
            },
          ],
        },
        null,
        2
      )
    );

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
    expect(siteJson.topics).toEqual({
      available: true,
      totalItems: 1,
      slug: "topics",
      label: "Topics",
    });
  });

  test("finds packaged debug UI dir from exported module entrypoints", async () => {
    const currentWorkingDirectory = join(testDir, "project");
    await mkdir(currentWorkingDirectory, { recursive: true });

    const fakePackageRoot = join(testDir, "node_modules", "iiif-hss");
    const fakeBuildDir = join(fakePackageRoot, "build", "dev-ui");
    await mkdir(fakeBuildDir, { recursive: true });

    const resolved = findDebugUiDir(currentWorkingDirectory, (specifier) => {
      if (specifier === "iiif-hss/package.json") {
        throw new Error("not exported");
      }
      if (specifier === "iiif-hss/astro") {
        return join(fakePackageRoot, "build", "astro-integration.js");
      }
      throw new Error(`unexpected specifier: ${specifier}`);
    });

    expect(resolved).toBe(fakeBuildDir);
  });

  test("finds packaged debug UI dir from node_modules without resolver", async () => {
    const projectDir = join(testDir, "apps", "sample");
    const fakeBuildDir = join(testDir, "node_modules", "iiif-hss", "build", "dev-ui");
    await mkdir(projectDir, { recursive: true });
    await mkdir(fakeBuildDir, { recursive: true });

    const resolved = findDebugUiDir(projectDir);
    expect(resolved).toBe(fakeBuildDir);
  });

  test("loads remote resource JSON in debug API when manifest is not saved locally", async () => {
    const server = await createServer({
      server: { url: "http://localhost:7111" },
      stores: {
        default: {
          type: "iiif-json",
          path: "./content",
        },
      },
    });

    await unlink(join(cwd(), ".iiif", "build", "manifests", "demo", "manifest.json"));
    await writeFile(
      join(cwd(), ".iiif", "build", "meta", "sitemap.json"),
      JSON.stringify(
        {
          "manifests/demo": {
            type: "Manifest",
            source: {
              type: "remote",
              url: "https://example.org/iiif/remote-demo/manifest.json",
            },
          },
        },
        null,
        2
      )
    );

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: any) => {
      if (String(input) !== "https://example.org/iiif/remote-demo/manifest.json") {
        return new Response("not found", { status: 404 });
      }
      return new Response(
        JSON.stringify({
          id: "https://example.org/iiif/remote-demo/manifest.json",
          type: "Manifest",
          label: { en: ["Remote demo"] },
          items: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as any;

    try {
      const resourceRes = await server.request("/_debug/api/resource/manifests/demo");
      expect(resourceRes.status).toBe(200);
      const resourceJson = await resourceRes.json();
      expect(resourceJson.resource?.id).toBe("https://example.org/iiif/remote-demo/manifest.json");
      expect(resourceJson.links.json).toBe("https://example.org/iiif/remote-demo/manifest.json");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("redirects /edit and saves remote override manifests when editable metadata is empty", async () => {
    const server = await createServer({
      server: { url: "http://localhost:7111" },
      stores: {
        default: {
          type: "iiif-json",
          path: "./content",
        },
      },
    });

    await writeFile(join(cwd(), ".iiif", "build", "meta", "editable.json"), JSON.stringify({}, null, 2));
    await writeFile(
      join(cwd(), ".iiif", "build", "meta", "sitemap.json"),
      JSON.stringify(
        {
          "manifests/demo": {
            type: "Manifest",
            source: {
              type: "remote",
              url: "https://example.org/iiif/remote-demo/manifest.json",
              overrides: "./content",
            },
          },
        },
        null,
        2
      )
    );

    const editRes = await server.request("/manifests/demo/edit", {
      redirect: "manual",
    });
    expect(editRes.status).toBe(302);
    expect(editRes.headers.get("location")).toBe(
      "https://manifest-editor.digirati.services/editor/external?manifest=http://localhost:7111/manifests/demo/manifest.json"
    );

    const updatedManifest = {
      id: "https://example.org/iiif/remote-demo/manifest.json",
      type: "Manifest",
      label: { en: ["Saved override"] },
      items: [],
    };

    const saveRes = await server.request("/manifests/demo/manifest.json", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(updatedManifest),
    });
    expect(saveRes.status).toBe(200);
    expect(await saveRes.json()).toEqual({ saved: true });

    const savedOverride = await readFile(join(cwd(), "content", "demo.json"), "utf-8");
    expect(JSON.parse(savedOverride)).toEqual(updatedManifest);
  });
});
