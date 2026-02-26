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
const createServerMock = vi.fn(async () => ({
  _extra: {
    cachedBuild: cachedBuildMock,
    app: { fetch: vi.fn(async () => new Response(null)) },
  },
  request: requestMock,
}));

vi.mock("../src/create-server", () => ({
  createServer: (...args: any[]) => createServerMock(...args),
}));

describe("astro integration lifecycle", () => {
  let testDir = "";

  beforeEach(() => {
    process.env.VITEST = "";
    cachedBuildMock.mockClear();
    createServerMock.mockClear();
    requestMock.mockClear();
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
    });
  });
});
