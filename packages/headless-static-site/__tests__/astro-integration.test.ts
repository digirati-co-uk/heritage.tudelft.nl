import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
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
    app: { fetch: vi.fn(async () => new Response(null)) },
    emitter: emitterMock,
  },
  request: requestMock,
}));

vi.mock("../src/create-server", () => ({
  createServer: (...args: any[]) => createServerMock(...args),
}));

const TOOLBAR_APP_ID = "iiif-hss-control-center";
const TOOLBAR_EVENTS = {
  healthCheck: `${TOOLBAR_APP_ID}:health-check`,
  healthResult: `${TOOLBAR_APP_ID}:health-result`,
  inspectPath: `${TOOLBAR_APP_ID}:inspect-path`,
  requestSnapshot: `${TOOLBAR_APP_ID}:request-snapshot`,
  resource: `${TOOLBAR_APP_ID}:resource`,
  runAction: `${TOOLBAR_APP_ID}:run-action`,
  snapshot: `${TOOLBAR_APP_ID}:snapshot`,
};

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    headers: {
      "content-type": "application/json",
    },
    status,
  });
}

describe("astro integration lifecycle", () => {
  let testDir = "";

  beforeEach(() => {
    process.env.VITEST = "";
    cachedBuildMock.mockClear();
    createServerMock.mockClear();
    requestMock.mockClear();
    emitterMock.on.mockClear();
    emitterListeners.clear();
  });

  afterEach(async () => {
    if (testDir) {
      await rm(testDir, { recursive: true, force: true });
      testDir = "";
    }
  });

  test("mounts middleware during astro dev server setup", async () => {
    const { iiifAstro } = await import("../src/astro-integration");
    const integration = iiifAstro({
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
    const hooks = integration.hooks as Record<string, (options: any) => Promise<void>>;
    const use = vi.fn();

    await hooks["astro:config:setup"]({
      command: "dev",
      config: { root: pathToFileURL(`${process.cwd()}/`) },
      isRestart: false,
      updateConfig: vi.fn(),
      addWatchFile: vi.fn(),
      logger: { info: vi.fn(), warn: vi.fn() },
    });
    await hooks["astro:server:setup"]({
      server: {
        config: {
          root: process.cwd(),
          server: {
            host: "localhost",
            port: 4321,
          },
        },
        middlewares: { use },
      },
    });

    await vi.waitFor(() => {
      expect(createServerMock).toHaveBeenCalledTimes(1);
      expect(use).toHaveBeenCalledTimes(1);
      expect(use.mock.calls[0][0]).toBe("/iiif");
      expect(cachedBuildMock).toHaveBeenCalledWith({ cache: true, emit: true, dev: true });
      expect(requestMock).toHaveBeenCalledWith("/watch");
    });
  });

  test("triggers Astro full-reload when IIIF resources refresh", async () => {
    const { iiifAstro } = await import("../src/astro-integration");
    const integration = iiifAstro({
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
    const hooks = integration.hooks as Record<string, (options: any) => Promise<void>>;
    const wsSend = vi.fn();

    await hooks["astro:config:setup"]({
      command: "dev",
      config: { root: pathToFileURL(`${process.cwd()}/`) },
      isRestart: false,
      updateConfig: vi.fn(),
      addWatchFile: vi.fn(),
      logger: { info: vi.fn(), warn: vi.fn() },
    });
    await hooks["astro:server:setup"]({
      server: {
        config: {
          root: process.cwd(),
          server: {
            host: "localhost",
            port: 4321,
          },
        },
        middlewares: { use: vi.fn() },
        ws: { send: wsSend },
      },
    });

    emitterMock.emit("file-refresh", { path: "content/demo.json" });

    await vi.waitFor(() => {
      expect(wsSend).toHaveBeenCalledWith({ type: "full-reload", path: "*" });
    });
  });

  test("rebuilds IIIF output when Astro reports a different bound port", async () => {
    const { iiifAstro } = await import("../src/astro-integration");
    const integration = iiifAstro({
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
    const hooks = integration.hooks as Record<string, (options: any) => Promise<void>>;

    await hooks["astro:config:setup"]({
      command: "dev",
      config: { root: pathToFileURL(`${process.cwd()}/`) },
      isRestart: false,
      updateConfig: vi.fn(),
      addWatchFile: vi.fn(),
      logger: { info: vi.fn(), warn: vi.fn() },
    });
    await hooks["astro:server:setup"]({
      server: {
        config: {
          root: process.cwd(),
          server: {
            host: "localhost",
            port: 4321,
          },
        },
        middlewares: { use: vi.fn() },
        ws: { send: vi.fn() },
      },
    });

    await vi.waitFor(() => {
      expect(cachedBuildMock).toHaveBeenCalledTimes(1);
    });

    await hooks["astro:server:start"]({
      address: {
        address: "::1",
        port: 4329,
      },
      logger: { info: vi.fn(), warn: vi.fn() },
    });

    await vi.waitFor(() => {
      expect(cachedBuildMock).toHaveBeenCalledTimes(2);
    });
  });

  test("runs build hook once for astro build", async () => {
    const { iiifAstro } = await import("../src/astro-integration");
    const integration = iiifAstro({
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
    const hooks = integration.hooks as Record<string, (options: any) => Promise<void>>;
    const logger = { info: vi.fn(), warn: vi.fn() };

    await hooks["astro:config:setup"]({
      command: "build",
      config: { root: pathToFileURL(`${process.cwd()}/`) },
      isRestart: false,
      updateConfig: vi.fn(),
      addWatchFile: vi.fn(),
      logger,
    });
    await hooks["astro:config:done"]({
      config: { root: pathToFileURL(`${process.cwd()}/`), mode: "production" },
    });
    await hooks["astro:build:start"]({ logger });
    await hooks["astro:build:start"]({ logger });

    expect(createServerMock).toHaveBeenCalledTimes(1);
    expect(cachedBuildMock).toHaveBeenCalledTimes(1);
    expect(cachedBuildMock).toHaveBeenCalledWith({ cache: false, emit: true });
  });

  test("copies artifacts into astro build output on build:done", async () => {
    testDir = await mkdtemp(join(tmpdir(), "iiif-hss-astro-integration-"));
    const source = join(testDir, ".iiif", "build");
    const outDir = join(testDir, "dist");
    await mkdir(source, { recursive: true });
    await mkdir(outDir, { recursive: true });
    await writeFile(join(source, "collection.json"), JSON.stringify({ type: "Collection" }));

    const { iiifAstro } = await import("../src/astro-integration");
    const integration = iiifAstro({
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
    const hooks = integration.hooks as Record<string, (options: any) => Promise<void>>;

    await hooks["astro:config:setup"]({
      command: "build",
      config: { root: pathToFileURL(`${testDir}/`) },
      isRestart: false,
      updateConfig: vi.fn(),
      addWatchFile: vi.fn(),
      logger: { info: vi.fn(), warn: vi.fn() },
    });
    await hooks["astro:config:done"]({
      config: { root: pathToFileURL(`${testDir}/`), mode: "production" },
    });
    await hooks["astro:build:done"]({
      dir: pathToFileURL(`${outDir}/`),
      logger: { info: vi.fn(), warn: vi.fn() },
    });

    const copiedCollection = join(outDir, "iiif", "collection.json");
    expect(existsSync(copiedCollection)).toBe(true);
    const loaded = JSON.parse(await readFile(copiedCollection, "utf-8"));
    expect(loaded.type).toBe("Collection");
  });

  test("copies artifacts into iiif subdirectory by default on astro build:done", async () => {
    testDir = await mkdtemp(join(tmpdir(), "iiif-hss-astro-integration-default-subdir-"));
    const source = join(testDir, ".iiif", "build");
    const outDir = join(testDir, "dist");
    await mkdir(source, { recursive: true });
    await mkdir(outDir, { recursive: true });
    await writeFile(join(source, "collection.json"), JSON.stringify({ type: "Collection" }));

    const { iiifAstro } = await import("../src/astro-integration");
    const integration = iiifAstro({
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
    const hooks = integration.hooks as Record<string, (options: any) => Promise<void>>;

    await hooks["astro:config:setup"]({
      command: "build",
      config: { root: pathToFileURL(`${testDir}/`) },
      isRestart: false,
      updateConfig: vi.fn(),
      addWatchFile: vi.fn(),
      logger: { info: vi.fn(), warn: vi.fn() },
    });
    await hooks["astro:config:done"]({
      config: { root: pathToFileURL(`${testDir}/`), mode: "production" },
    });
    await hooks["astro:build:done"]({
      dir: pathToFileURL(`${outDir}/`),
      logger: { info: vi.fn(), warn: vi.fn() },
    });

    const copiedCollection = join(outDir, "iiif", "collection.json");
    expect(existsSync(copiedCollection)).toBe(true);
    const loaded = JSON.parse(await readFile(copiedCollection, "utf-8"));
    expect(loaded.type).toBe("Collection");
  });

  test("injects preview plugin and mounts middleware in astro preview", async () => {
    const { iiifAstro } = await import("../src/astro-integration");
    const integration = iiifAstro({
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
    const hooks = integration.hooks as Record<string, (options: any) => Promise<void>>;
    const updateConfig = vi.fn();
    const logger = { info: vi.fn(), warn: vi.fn() };

    await hooks["astro:config:setup"]({
      command: "preview",
      config: { root: pathToFileURL(`${process.cwd()}/`) },
      isRestart: false,
      updateConfig,
      addWatchFile: vi.fn(),
      logger,
    });

    const plugins = updateConfig.mock.calls[0][0]?.vite?.plugins as any[];
    expect(Array.isArray(plugins)).toBe(true);
    expect(plugins.length).toBe(1);
    const previewPlugin = plugins[0];
    const use = vi.fn();

    await previewPlugin.configurePreviewServer({
      config: {
        root: process.cwd(),
        preview: {
          host: "127.0.0.1",
          port: 4321,
        },
      },
      middlewares: { use },
    });

    expect(createServerMock).toHaveBeenCalledTimes(1);
    expect(use).toHaveBeenCalledTimes(1);
    expect(use.mock.calls[0][0]).toBe("/iiif");
  });

  test("normalizes IPv6 localhost in astro server:start", async () => {
    const { iiifAstro } = await import("../src/astro-integration");
    const integration = iiifAstro({
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
    const hooks = integration.hooks as Record<string, (options: any) => Promise<void>>;
    const logger = { info: vi.fn(), warn: vi.fn() };

    await hooks["astro:config:setup"]({
      command: "dev",
      config: { root: pathToFileURL(`${process.cwd()}/`) },
      isRestart: false,
      updateConfig: vi.fn(),
      addWatchFile: vi.fn(),
      logger,
    });

    await hooks["astro:server:start"]({
      address: {
        address: "::1",
        port: 4321,
      },
      logger,
    });

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("http://localhost:4321/iiif/_debug"));
  });

  test("supports shorthand manifest and collection URL lists", async () => {
    const { iiifAstro } = await import("../src/astro-integration");
    const integration = iiifAstro({
      enabled: true,
      manifests: ["https://example.org/iiif/a/manifest.json", "https://example.org/iiif/b/manifest.json"],
      collections: ["https://example.org/iiif/root/collection.json"],
      save: true,
      folder: "./content-overrides",
    });
    const hooks = integration.hooks as Record<string, (options: any) => Promise<void>>;
    const use = vi.fn();

    await hooks["astro:config:setup"]({
      command: "dev",
      config: { root: pathToFileURL(`${process.cwd()}/`) },
      isRestart: false,
      updateConfig: vi.fn(),
      addWatchFile: vi.fn(),
      logger: { info: vi.fn(), warn: vi.fn() },
    });
    await hooks["astro:server:setup"]({
      server: {
        config: {
          root: process.cwd(),
          server: {
            host: "localhost",
            port: 4321,
          },
        },
        middlewares: { use },
      },
      logger: { warn: vi.fn() },
    });

    await vi.waitFor(() => {
      const configured = createServerMock.mock.calls.at(-1)?.[0] as any;
      expect(configured.stores.content.type).toBe("iiif-remote");
      expect(configured.stores.content.urls).toEqual([
        "https://example.org/iiif/root/collection.json",
        "https://example.org/iiif/a/manifest.json",
        "https://example.org/iiif/b/manifest.json",
      ]);
      expect(configured.stores.content.saveManifests).toBe(true);
      expect(configured.stores.content.overrides).toBe("./content-overrides");
      expect(configured.stores.default).toBeUndefined();
    });
  });

  test("registers dev toolbar app during astro config setup", async () => {
    const { iiifAstro } = await import("../src/astro-integration");
    const integration = iiifAstro({
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
    const hooks = integration.hooks as Record<string, (options: any) => Promise<void>>;
    const addDevToolbarApp = vi.fn();

    await hooks["astro:config:setup"]({
      addDevToolbarApp,
      addWatchFile: vi.fn(),
      command: "dev",
      config: { root: pathToFileURL(`${process.cwd()}/`) },
      isRestart: false,
      logger: { info: vi.fn(), warn: vi.fn() },
      updateConfig: vi.fn(),
    });

    expect(addDevToolbarApp).toHaveBeenCalledTimes(1);
    expect(addDevToolbarApp).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: expect.any(String),
        id: TOOLBAR_APP_ID,
        name: "IIIF HSS",
      })
    );
  });

  test("serves toolbar snapshot, inspect, action, and health events", async () => {
    const handlers = new Map<string, (payload: any) => Promise<void> | void>();
    let watching = false;

    requestMock.mockImplementation(async (path: string) => {
      if (path === "/config") {
        return jsonResponse({
          isWatching: watching,
          pendingFiles: watching ? ["content/demo/manifest.json"] : [],
        });
      }
      if (path === "/_debug/api/site") {
        return jsonResponse({
          build: {
            buildCount: 2,
            completedAt: null,
            lastError: null,
            startedAt: null,
            status: "ready",
          },
          onboarding: {
            configMode: "default",
            contentFolder: "./content",
            enabled: true,
            hints: {
              addContent: "Add IIIF JSON files into ./content",
            },
            shorthand: null,
          },
          resources: [
            {
              slug: "content/demo",
              source: { path: "./content/demo/manifest.json", type: "disk" },
              type: "Manifest",
            },
          ],
        });
      }
      if (path === "/watch") {
        watching = true;
        return jsonResponse({ watching: true });
      }
      if (path === "/unwatch") {
        watching = false;
        return jsonResponse({ watching: false });
      }
      if (path.startsWith("/build?")) {
        return jsonResponse({
          emitted: {
            stats: {
              built: 1,
            },
          },
        });
      }
      if (path === "/build/save") {
        return jsonResponse({ saved: true, total: 1 });
      }
      if (path === "/content/demo/manifest.json") {
        return jsonResponse({ id: "https://example.org/content/demo/manifest.json", type: "Manifest" });
      }
      if (path.startsWith("/_debug/api/resource/")) {
        return jsonResponse({
          diskPath: process.cwd(),
          isEditable: false,
          links: {
            json: "http://localhost:4321/content/demo/manifest.json",
            localJson: "http://localhost:4321/content/demo/manifest.json",
            remoteJson: null,
          },
          resource: {
            id: "https://example.org/content/demo/manifest.json",
            label: { en: ["Demo"] },
            type: "Manifest",
          },
          slug: "content/demo",
          source: { path: "./content/demo/manifest.json", type: "disk" },
          type: "Manifest",
        });
      }

      return jsonResponse({});
    });

    const toolbar = {
      on: vi.fn((event: string, callback: (payload: any) => Promise<void> | void) => {
        handlers.set(event, callback);
      }),
      onAppInitialized: vi.fn(),
      onAppToggled: vi.fn(),
      send: vi.fn(),
    };

    const { iiifAstro } = await import("../src/astro-integration");
    const integration = iiifAstro({
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
    const hooks = integration.hooks as Record<string, (options: any) => Promise<void>>;

    await hooks["astro:config:setup"]({
      addDevToolbarApp: vi.fn(),
      addWatchFile: vi.fn(),
      command: "dev",
      config: { root: pathToFileURL(`${process.cwd()}/`) },
      isRestart: false,
      logger: { info: vi.fn(), warn: vi.fn() },
      updateConfig: vi.fn(),
    });
    await hooks["astro:server:setup"]({
      logger: { warn: vi.fn() },
      server: {
        config: {
          root: process.cwd(),
          server: {
            host: "localhost",
            port: 4321,
          },
        },
        middlewares: { use: vi.fn() },
      },
      toolbar,
    });

    await handlers.get(TOOLBAR_EVENTS.requestSnapshot)?.({});
    await handlers.get(TOOLBAR_EVENTS.inspectPath)?.({ pathname: "/manifests/content/demo" });
    await handlers.get(TOOLBAR_EVENTS.runAction)?.({ action: "toggle-watch" });
    await handlers.get(TOOLBAR_EVENTS.healthCheck)?.({ slug: "content/demo" });

    expect(toolbar.send).toHaveBeenCalledWith(
      TOOLBAR_EVENTS.snapshot,
      expect.objectContaining({
        config: expect.objectContaining({ isWatching: expect.any(Boolean) }),
      })
    );
    expect(toolbar.send).toHaveBeenCalledWith(
      TOOLBAR_EVENTS.resource,
      expect.objectContaining({
        found: true,
        resolvedSlug: "content/demo",
      })
    );
    expect(toolbar.send).toHaveBeenCalledWith(
      `${TOOLBAR_APP_ID}:action-result`,
      expect.objectContaining({
        action: "toggle-watch",
        ok: true,
      })
    );
    expect(toolbar.send).toHaveBeenCalledWith(
      TOOLBAR_EVENTS.healthResult,
      expect.objectContaining({
        slug: "content/demo",
        summary: expect.objectContaining({
          ok: expect.any(Boolean),
        }),
      })
    );
  });
});
