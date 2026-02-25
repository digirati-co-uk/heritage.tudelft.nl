import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const cachedBuildMock = vi.fn(async () => ({
  buildConfig: {
    buildDir: ".iiif/build",
  },
}));
const requestMock = vi.fn(async () => new Response(null));
const createServerMock = vi.fn(async () => ({
  _extra: {
    cachedBuild: cachedBuildMock,
    app: { fetch: vi.fn() },
  },
  request: requestMock,
}));

vi.mock("../src/create-server", () => ({
  createServer: (...args: any[]) => createServerMock(...args),
}));

describe("vite plugin lifecycle", () => {
  let testDir = "";

  beforeEach(() => {
    process.env.VITEST = "";
    cachedBuildMock.mockClear();
    requestMock.mockClear();
    createServerMock.mockClear();
  });

  afterEach(async () => {
    if (testDir) {
      await rm(testDir, { recursive: true, force: true });
      testDir = "";
    }
  });

  test("runs build hook safely in build mode without starting watch", async () => {
    const { iiifPlugin } = await import("../src/vite-plugin");
    const plugin = iiifPlugin({
      enabled: true,
      config: {
        stores: {
          local: {
            type: "iiif-remote",
            url: "https://example.org/iiif/collection.json",
          },
        },
      },
    });

    await plugin.configResolved?.({
      command: "build",
      mode: "production",
    } as any);

    await plugin.buildStart?.call({} as any);

    expect(createServerMock).toHaveBeenCalledTimes(1);
    expect(cachedBuildMock).toHaveBeenCalledTimes(1);
    expect(cachedBuildMock).toHaveBeenCalledWith({ cache: false, emit: true });
    expect(requestMock).not.toHaveBeenCalledWith("/watch");
  });

  test("skips build work when vite command is serve", async () => {
    const { iiifPlugin } = await import("../src/vite-plugin");
    const plugin = iiifPlugin({
      enabled: true,
      config: {
        stores: {
          local: {
            type: "iiif-remote",
            url: "https://example.org/iiif/collection.json",
          },
        },
      },
    });

    await plugin.configResolved?.({
      command: "serve",
      mode: "development",
    } as any);

    await plugin.buildStart?.call({} as any);

    expect(createServerMock).not.toHaveBeenCalled();
    expect(cachedBuildMock).not.toHaveBeenCalled();
  });

  test("is disabled by default in vitest environment", async () => {
    process.env.VITEST = "true";
    const { iiifPlugin } = await import("../src/vite-plugin");
    const plugin = iiifPlugin({
      config: {
        stores: {
          local: {
            type: "iiif-remote",
            url: "https://example.org/iiif/collection.json",
          },
        },
      },
    });

    await plugin.configResolved?.({
      command: "build",
      mode: "test",
    } as any);

    await plugin.buildStart?.call({} as any);

    expect(createServerMock).not.toHaveBeenCalled();
    expect(cachedBuildMock).not.toHaveBeenCalled();
  });

  test("mounts middleware in preview mode", async () => {
    const { iiifPlugin } = await import("../src/vite-plugin");
    const plugin = iiifPlugin({
      enabled: true,
      config: {
        stores: {
          local: {
            type: "iiif-remote",
            url: "https://example.org/iiif/collection.json",
          },
        },
      },
    });

    await plugin.configResolved?.({
      command: "serve",
      mode: "production",
      root: process.cwd(),
      build: {
        outDir: "dist",
      },
    } as any);

    const use = vi.fn();
    await plugin.configurePreviewServer?.({
      config: {
        preview: {
          host: "127.0.0.1",
          port: 4173,
        },
      },
      middlewares: {
        use,
      },
    } as any);

    expect(createServerMock).toHaveBeenCalledTimes(1);
    expect(use).toHaveBeenCalledTimes(1);
    expect(use.mock.calls[0][0]).toBe("/iiif");
    expect(typeof use.mock.calls[0][1]).toBe("function");
  });

  test("prints IIIF debug URL after Vite local URL", async () => {
    const { iiifPlugin } = await import("../src/vite-plugin");
    const plugin = iiifPlugin({
      enabled: true,
      basePath: "/iiif",
      config: {
        stores: {
          local: {
            type: "iiif-remote",
            url: "https://example.org/iiif/collection.json",
          },
        },
      },
    });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => void 0);
    const printUrls = vi.fn(() => {
      console.log("  ➜  Local:   http://localhost:5173/");
    });
    const use = vi.fn();
    const devServer = {
      config: {
        server: {
          host: "localhost",
          port: 5173,
        },
      },
      httpServer: {
        listening: false,
      },
      resolvedUrls: {
        local: ["http://localhost:5173/"],
        network: [],
      },
      printUrls,
      middlewares: {
        use,
      },
    } as any;

    try {
      await plugin.configureServer?.(devServer);
      devServer.printUrls();
      expect(logSpy).toHaveBeenCalledWith("  ➜  Local:   http://localhost:5173/");
      expect(
        logSpy.mock.calls.find(([line]) => String(line).includes("IIIF:") && String(line).includes("/iiif/_debug"))
      ).toBeTruthy();
      expect(logSpy.mock.calls.find(([line]) => String(line).includes("IIIF server started at /iiif"))).toBeUndefined();
    } finally {
      logSpy.mockRestore();
    }
  });

  test("copies iiif artifacts into vite outDir on closeBundle", async () => {
    testDir = await mkdtemp(join(tmpdir(), "iiif-hss-vite-plugin-"));
    const source = join(testDir, ".iiif", "build");
    const sourceMeta = join(source, "meta");
    const outDir = join(testDir, "dist");
    await mkdir(sourceMeta, { recursive: true });
    await writeFile(join(source, "collection.json"), JSON.stringify({ type: "Collection" }));
    await writeFile(join(sourceMeta, "sitemap.json"), JSON.stringify({ test: true }));

    const { iiifPlugin } = await import("../src/vite-plugin");
    const plugin = iiifPlugin({
      enabled: true,
      iiifBuildDir: source,
      outSubDir: "iiif",
      config: {
        stores: {
          local: {
            type: "iiif-remote",
            url: "https://example.org/iiif/collection.json",
          },
        },
      },
    });

    await plugin.configResolved?.({
      command: "build",
      mode: "production",
      root: testDir,
      build: {
        outDir,
      },
    } as any);

    await plugin.closeBundle?.call({} as any);

    const copiedCollection = join(outDir, "iiif", "collection.json");
    const copiedSitemap = join(outDir, "iiif", "meta", "sitemap.json");
    expect(existsSync(copiedCollection)).toBe(true);
    expect(existsSync(copiedSitemap)).toBe(true);
    const loaded = JSON.parse(await readFile(copiedCollection, "utf-8"));
    expect(loaded.type).toBe("Collection");
  });
});
