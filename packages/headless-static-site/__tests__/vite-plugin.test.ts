import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chdir, cwd } from "node:process";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const cachedBuildMock = vi.fn(async () => ({
  buildConfig: {
    buildDir: ".iiif/build",
  },
}));
const requestMock = vi.fn(async () => new Response(null));
const emitterListeners = new Map<string, Set<(payload: any) => void>>();
const emitterMock = {
  emit(event: string, payload?: any) {
    const listeners = emitterListeners.get(event);
    if (!listeners) {
      return;
    }
    for (const listener of listeners) {
      listener(payload);
    }
  },
  on: vi.fn((event: string, listener: (payload: any) => void) => {
    if (!emitterListeners.has(event)) {
      emitterListeners.set(event, new Set());
    }
    emitterListeners.get(event)?.add(listener);
  }),
};
const createServerMock = vi.fn(async () => ({
  _extra: {
    cachedBuild: cachedBuildMock,
    app: { fetch: vi.fn() },
    emitter: emitterMock,
  },
  request: requestMock,
}));

vi.mock("../src/create-server", () => ({
  createServer: (...args: any[]) => createServerMock(...args),
}));

describe("vite plugin lifecycle", () => {
  const originalCwd = cwd();
  let testDir = "";

  beforeEach(() => {
    chdir(originalCwd);
    process.env.VITEST = "";
    cachedBuildMock.mockClear();
    requestMock.mockClear();
    createServerMock.mockClear();
    emitterMock.on.mockClear();
    emitterListeners.clear();
  });

  afterEach(async () => {
    chdir(originalCwd);
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

  test("uses explicit serverUrl option for build-time emitted IDs", async () => {
    const { iiifPlugin } = await import("../src/vite-plugin");
    const plugin = iiifPlugin({
      enabled: true,
      serverUrl: "https://iiif.example.org",
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
      root: process.cwd(),
      build: {
        outDir: "dist",
      },
    } as any);

    await plugin.buildStart?.call({} as any);

    const configured = createServerMock.mock.calls.at(-1)?.[0] as any;
    expect(configured.server?.url).toBe("https://iiif.example.org");
  });

  test("uses deployment env URL defaults in build mode", async () => {
    const originalServerUrl = process.env.SERVER_URL;
    const originalVercelUrl = process.env.VERCEL_URL;
    try {
      delete process.env.SERVER_URL;
      process.env.VERCEL_URL = "my-site.vercel.app";

      const { iiifPlugin } = await import("../src/vite-plugin");
      const plugin = iiifPlugin({
        enabled: true,
        config: {
          server: {
            // Clear server URL so env-based build URL fallback can be asserted.
            url: "",
          },
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
        root: process.cwd(),
        build: {
          outDir: "dist",
        },
      } as any);

      await plugin.buildStart?.call({} as any);

      const configured = createServerMock.mock.calls.at(-1)?.[0] as any;
      expect(configured.server?.url).toBe("https://my-site.vercel.app");
    } finally {
      if (typeof originalServerUrl === "string") {
        process.env.SERVER_URL = originalServerUrl;
      } else {
        delete process.env.SERVER_URL;
      }
      if (typeof originalVercelUrl === "string") {
        process.env.VERCEL_URL = originalVercelUrl;
      } else {
        delete process.env.VERCEL_URL;
      }
    }
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

  test("triggers Vite full-reload when IIIF resources refresh", async () => {
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
      root: process.cwd(),
      build: {
        outDir: "dist",
      },
    } as any);

    const wsSend = vi.fn();
    await plugin.configureServer?.({
      config: {
        server: {
          host: "localhost",
          port: 5173,
        },
      },
      middlewares: {
        use: vi.fn(),
      },
      httpServer: {
        listening: false,
      },
      ws: {
        send: wsSend,
      },
    } as any);

    emitterMock.emit("file-refresh", { path: "content/demo.json" });

    await vi.waitFor(() => {
      expect(wsSend).toHaveBeenCalledWith({ type: "full-reload", path: "*" });
    });
  });

  test("rebuilds IIIF output when actual Vite listen port differs", async () => {
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
      root: process.cwd(),
      build: {
        outDir: "dist",
      },
    } as any);

    let listeningCallback: (() => void) | null = null;
    const httpServer = {
      listening: false,
      address: vi.fn(() => ({
        address: "::",
        port: 5199,
      })),
      once: vi.fn((event: string, callback: () => void) => {
        if (event === "listening") {
          listeningCallback = callback;
        }
      }),
    };

    await plugin.configureServer?.({
      config: {
        server: {
          host: "localhost",
          port: 5173,
        },
      },
      middlewares: {
        use: vi.fn(),
      },
      httpServer,
      ws: {
        send: vi.fn(),
      },
    } as any);

    await vi.waitFor(() => {
      expect(cachedBuildMock).toHaveBeenCalledTimes(1);
    });
    expect(listeningCallback).toBeTruthy();

    httpServer.listening = true;
    listeningCallback?.();

    await vi.waitFor(() => {
      expect(cachedBuildMock).toHaveBeenCalledTimes(2);
    });
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

  test("copies iiif artifacts into vite outDir/iiif by default", async () => {
    testDir = await mkdtemp(join(tmpdir(), "iiif-hss-vite-plugin-default-subdir-"));
    const source = join(testDir, ".iiif", "build");
    const outDir = join(testDir, "dist");
    await mkdir(source, { recursive: true });
    await mkdir(outDir, { recursive: true });
    await writeFile(join(source, "collection.json"), JSON.stringify({ type: "Collection" }));

    const { iiifPlugin } = await import("../src/vite-plugin");
    const plugin = iiifPlugin({
      enabled: true,
      iiifBuildDir: source,
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
    expect(existsSync(copiedCollection)).toBe(true);
    const loaded = JSON.parse(await readFile(copiedCollection, "utf-8"));
    expect(loaded.type).toBe("Collection");
  });

  test("builds remote content store from shorthand options", async () => {
    const { iiifPlugin } = await import("../src/vite-plugin");
    const plugin = iiifPlugin({
      enabled: true,
      collection: "https://example.org/iiif/collection.json",
      save: true,
      folder: "./overrides",
    });

    await plugin.configResolved?.({
      command: "serve",
      mode: "development",
      root: process.cwd(),
      build: {
        outDir: "dist",
      },
    } as any);

    const use = vi.fn();
    await plugin.configureServer?.({
      config: {
        server: {
          host: "localhost",
          port: 5173,
        },
      },
      middlewares: {
        use,
      },
      httpServer: {
        listening: false,
      },
    } as any);

    const configured = createServerMock.mock.calls.at(-1)?.[0] as any;
    expect(configured.stores.content.type).toBe("iiif-remote");
    expect(configured.stores.content.url).toBe("https://example.org/iiif/collection.json");
    expect(configured.stores.content.saveManifests).toBe(true);
    expect(configured.stores.content.overrides).toBe("./overrides");
    expect(configured.stores.default).toBeUndefined();
  });

  test("merges inline config with iiif-config folder config", async () => {
    testDir = await mkdtemp(join(tmpdir(), "iiif-hss-vite-merge-"));
    chdir(testDir);
    await mkdir(join(testDir, "iiif-config", "stores"), { recursive: true });
    await mkdir(join(testDir, "iiif-config", "config"), { recursive: true });
    await writeFile(join(testDir, "iiif-config", "config.yml"), "");
    await writeFile(
      join(testDir, "iiif-config", "stores", "local.json"),
      JSON.stringify({ type: "iiif-json", path: "./content" })
    );
    await writeFile(
      join(testDir, "iiif-config", "config", "extract-topics.json"),
      JSON.stringify({
        topicTypes: {
          date: ["Year"],
        },
      })
    );

    const { iiifPlugin } = await import("../src/vite-plugin");
    const plugin = iiifPlugin({
      enabled: true,
      config: {
        config: {
          "extract-topics": {
            topicTypes: {
              contributor: ["Contributor"],
            },
          },
        },
      },
    });

    await plugin.configResolved?.({
      command: "serve",
      mode: "development",
      root: testDir,
      build: {
        outDir: "dist",
      },
    } as any);

    await plugin.configureServer?.({
      config: {
        server: {
          host: "localhost",
          port: 5173,
        },
      },
      middlewares: {
        use: vi.fn(),
      },
      httpServer: {
        listening: false,
      },
    } as any);

    const configured = createServerMock.mock.calls.at(-1)?.[0] as any;
    expect(configured.stores.local).toEqual({
      type: "iiif-json",
      path: "./content",
    });
    expect(configured.config["extract-topics"].topicTypes).toEqual({
      date: ["Year"],
      contributor: ["Contributor"],
    });
  });

  test("rejects shorthand-only options without manifest or collection URLs", async () => {
    const { iiifPlugin } = await import("../src/vite-plugin");
    const plugin = iiifPlugin({
      enabled: true,
      save: true,
    });

    await plugin.configResolved?.({
      command: "serve",
      mode: "development",
      root: process.cwd(),
      build: {
        outDir: "dist",
      },
    } as any);

    await expect(
      plugin.configureServer?.({
        config: {
          server: {
            host: "localhost",
            port: 5173,
          },
        },
        middlewares: {
          use: vi.fn(),
        },
      } as any)
    ).rejects.toThrow("`save` can only be used");
  });

  test("resets dev cache on config hash change and preserves request cache", async () => {
    testDir = await mkdtemp(join(tmpdir(), "iiif-hss-vite-config-hash-"));
    const cacheDir = join(testDir, ".iiif", "dev", "cache");
    const requestsDir = join(cacheDir, "_requests");
    const staleDir = join(cacheDir, "stale");
    const requestFile = join(requestsDir, "request.json");
    const staleFile = join(staleDir, "old.json");

    await mkdir(requestsDir, { recursive: true });
    await mkdir(staleDir, { recursive: true });
    await writeFile(requestFile, JSON.stringify({ ok: true }));
    await writeFile(staleFile, JSON.stringify({ stale: true }));

    const configure = async (collection: string) => {
      const { iiifPlugin } = await import("../src/vite-plugin");
      const plugin = iiifPlugin({
        enabled: true,
        collection,
      });

      await plugin.configResolved?.({
        command: "serve",
        mode: "development",
        root: testDir,
        build: {
          outDir: "dist",
        },
      } as any);

      await plugin.configureServer?.({
        config: {
          server: {
            host: "localhost",
            port: 5173,
          },
        },
        middlewares: {
          use: vi.fn(),
        },
        httpServer: {
          listening: false,
        },
      } as any);
    };

    await configure("https://example.org/iiif/a/collection.json");
    await vi.waitFor(() => {
      expect(existsSync(join(testDir, ".iiif", "dev", ".config-hash"))).toBe(true);
    });

    await writeFile(staleFile, JSON.stringify({ stale: "again" }));

    await configure("https://example.org/iiif/b/collection.json");
    await vi.waitFor(() => {
      expect(existsSync(staleFile)).toBe(false);
    });
    expect(existsSync(requestFile)).toBe(true);
  });
});
