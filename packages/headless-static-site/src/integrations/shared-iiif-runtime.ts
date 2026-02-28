import { existsSync } from "node:fs";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import chalk from "chalk";
import objectHash from "object-hash";
import { version } from "../../package.json";
import { createServer } from "../create-server";
import {
  DEFAULT_CONFIG,
  type IIIFRC,
  type ResolvedConfigSource,
  getCustomConfigSource,
  resolveConfigSource,
} from "../util/get-config";
import { resolveHostUrl } from "../util/resolve-host-url";

export interface IIIFHSSSPluginOptions {
  /**
   * Base path for the Hono server routes.
   */
  basePath?: string;

  /**
   * Path to iiifrc.
   */
  configFile?: string;

  /**
   * Inline config overrides.
   */
  config?: Omit<IIIFRC, "stores"> & { stores?: IIIFRC["stores"] };

  /**
   * Shorthand: single remote collection URL.
   */
  collection?: string;

  /**
   * Shorthand: list of remote collection URLs.
   */
  collections?: string[];

  /**
   * Shorthand: single remote manifest URL.
   */
  manifest?: string;

  /**
   * Shorthand: list of remote manifest URLs.
   */
  manifests?: string[];

  /**
   * Shorthand-only: override saveManifests.
   */
  save?: boolean;

  /**
   * Shorthand-only: override folder for local manifest overrides.
   */
  folder?: string;

  enabled?: boolean;

  /**
   * Override port (e.g. Astro).
   */
  port?: number;

  /**
   * Override host.
   */
  host?: string;

  /**
   * Copy generated IIIF build output into final outDir after build.
   */
  copyBuildToOutDir?: boolean;

  /**
   * Override IIIF build source directory used for copy.
   */
  iiifBuildDir?: string;

  /**
   * Optional sub-directory inside outDir.
   */
  outSubDir?: string;

  /**
   * Canonical public server URL used for emitted IIIF IDs during build.
   */
  serverUrl?: string;

  /**
   * Source
   */
  source?: "vite" | "astro";
}

type MiddlewareContainer = {
  use: (path: string, handler: (req: any, res: any, next: () => void) => Promise<void>) => void;
};

type RuntimeLogger = {
  info?: (message: string) => void;
  warn?: (message: string) => void;
};

type ShorthandResolution = {
  enabled: boolean;
  urls: string[];
  saveManifests: boolean;
  overrides: string;
};

export interface RuntimeOnboardingInfo {
  enabled: boolean;
  configMode: string;
  contentFolder: string | null;
  shorthand: ShorthandResolution | null;
  hints: {
    addContent: string;
    astro: string;
    vite: string;
  };
}

function trimString(value: string) {
  return value.trim();
}

function normalizeShorthandUrls(
  options: Pick<IIIFHSSSPluginOptions, "collection" | "collections" | "manifest" | "manifests">
) {
  const allValues = [
    options.collection,
    options.manifest,
    ...(options.collections || []),
    ...(options.manifests || []),
  ].filter((value): value is string => typeof value === "string");

  const uniqueUrls = new Set<string>();
  for (const value of allValues) {
    const trimmed = trimString(value);
    if (!trimmed) {
      continue;
    }
    uniqueUrls.add(trimmed);
  }

  return [...uniqueUrls];
}

function normalizeShorthandConfig(
  configSource: ResolvedConfigSource,
  options: Pick<IIIFHSSSPluginOptions, "collection" | "collections" | "manifest" | "manifests" | "save" | "folder">
) {
  const shorthandUrls = normalizeShorthandUrls(options);
  const usesShorthand = shorthandUrls.length > 0;

  if (typeof options.save !== "undefined" && !usesShorthand) {
    throw new Error("iiif-hss: `save` can only be used with `collection`, `collections`, `manifest`, or `manifests`.");
  }
  if (typeof options.folder !== "undefined" && !usesShorthand) {
    throw new Error(
      "iiif-hss: `folder` can only be used with `collection`, `collections`, `manifest`, or `manifests`."
    );
  }

  const nextConfig: IIIFRC = {
    ...configSource.config,
    stores: {
      ...(configSource.config.stores || {}),
    },
  };

  let shorthand: ShorthandResolution | null = null;
  if (usesShorthand) {
    // In default mode, drop the implicit local "default" json store to avoid duplicate content stores.
    if (configSource.mode === "default") {
      nextConfig.stores = {};
    }

    const overrides = options.folder || "./content";
    const saveManifests = options.save ?? false;
    shorthand = {
      enabled: true,
      urls: shorthandUrls,
      saveManifests,
      overrides,
    };

    const remoteStore =
      shorthandUrls.length === 1
        ? {
            type: "iiif-remote" as const,
            url: shorthandUrls[0],
            overrides,
            saveManifests,
          }
        : {
            type: "iiif-remote" as const,
            urls: shorthandUrls,
            overrides,
            saveManifests,
          };

    nextConfig.stores.content = remoteStore as any;
  }

  return {
    configSource: {
      ...configSource,
      config: nextConfig,
    },
    shorthand,
  };
}

function sanitizeConfigForHash(config: IIIFRC) {
  const clone = JSON.parse(JSON.stringify(config || {})) as IIIFRC;
  if (clone.server && typeof clone.server === "object") {
    const serverConfig = clone.server as any;
    delete serverConfig.url;
    if (Object.keys(serverConfig).length === 0) {
      delete (clone as any).server;
    }
  }
  return clone;
}

function normalizeAbsoluteHttpUrl(input: string | null | undefined) {
  if (!input || typeof input !== "string") {
    return null;
  }
  const trimmed = resolveHostUrl(input.trim());
  if (!trimmed) {
    return null;
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }
  return trimmed.replace(/\/+$/, "");
}

function resolveBuildUrlFromEnv() {
  const serverUrl = normalizeAbsoluteHttpUrl(process.env.SERVER_URL);
  if (serverUrl) {
    return serverUrl;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, "");
  }

  if (process.env.RENDER_INTERNAL_HOSTNAME) {
    const maybePort = process.env.PORT ? `:${process.env.PORT}` : "";
    return `http://${process.env.RENDER_INTERNAL_HOSTNAME}${maybePort}`.replace(/\/+$/, "");
  }

  const url = normalizeAbsoluteHttpUrl(process.env.URL);
  if (url?.includes("localhost")) {
    return url;
  }

  const deployPrimeUrl = normalizeAbsoluteHttpUrl(process.env.DEPLOY_PRIME_URL);
  if (deployPrimeUrl) {
    return deployPrimeUrl;
  }

  if (url) {
    return url;
  }

  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function createIiifRuntime(options: IIIFHSSSPluginOptions = {}) {
  const {
    basePath = "/iiif",
    port,
    host,
    enabled,
    copyBuildToOutDir = true,
    iiifBuildDir,
    outSubDir,
    serverUrl,
    config: customConfig,
    configFile,
    collection,
    collections,
    manifest,
    manifests,
    save,
    folder,
  } = options;

  const isVitest = typeof process !== "undefined" && Boolean(process.env.VITEST);
  const runtimeEnabled = enabled ?? !isVitest;

  let server: Awaited<ReturnType<typeof createServer>> | null = null;
  let resolvedRoot: string | null = null;
  let lastIiifBuildDir: string | null = null;
  let resolvedConfig: Awaited<ReturnType<typeof resolveConfigSource>> | null = null;
  let resolvedShorthand: ShorthandResolution | null = null;
  let onboardingInfo: RuntimeOnboardingInfo = {
    enabled: false,
    configMode: "unknown",
    contentFolder: null,
    shorthand: null,
    hints: {
      addContent: "Add IIIF JSON files into ./content",
      astro: options.source === "astro" ? "iiif({ collection: 'https://example.org/iiif/collection.json' })" : "",
      vite: options.source === "vite" ? "iiifPlugin({ collection: 'https://example.org/iiif/collection.json' })" : "",
    },
  };
  let didStartDevBuild = false;
  let didStartWatch = false;
  let didAttachHmrBridge = false;
  let devBuildQueue: Promise<void> = Promise.resolve();

  async function ensureCacheDirectoryInvalidation(devMode: boolean, logger?: RuntimeLogger) {
    const configSource = await resolveIiifConfig();
    const configHash = objectHash(sanitizeConfigForHash(configSource.config), { unorderedObjects: true });
    const hashFilePath = toAbsolutePath(devMode ? ".iiif/dev/.config-hash" : ".iiif/.config-hash");
    const cachePath = toAbsolutePath(devMode ? ".iiif/dev/cache" : ".iiif/cache");

    let previousHash = "";
    if (existsSync(hashFilePath)) {
      previousHash = (await readFile(hashFilePath, "utf-8")).trim();
    }

    if (previousHash && previousHash !== configHash && existsSync(cachePath)) {
      const cacheEntries = await readdir(cachePath, { withFileTypes: true });
      for (const entry of cacheEntries) {
        if (entry.name === "_requests") {
          continue;
        }
        await rm(join(cachePath, entry.name), { recursive: true, force: true });
      }
      logger?.warn?.(`${chalk.bold.white`IIIF`}: Config changed, cache reset (preserved network request cache).`);
    }

    await mkdir(dirname(hashFilePath), { recursive: true });
    await writeFile(hashFilePath, `${configHash}\n`, "utf-8");
  }

  async function resolveIiifConfig() {
    if (resolvedConfig) {
      return resolvedConfig;
    }
    const loadedConfigSource = customConfig
      ? getCustomConfigSource(customConfig as IIIFRC)
      : await resolveConfigSource(configFile);
    const normalized = normalizeShorthandConfig(loadedConfigSource, {
      collection,
      collections,
      manifest,
      manifests,
      save,
      folder,
    });
    resolvedConfig = normalized.configSource;
    resolvedShorthand = normalized.shorthand;

    if (!resolvedConfig.config.stores) {
      resolvedConfig.config.stores = DEFAULT_CONFIG.stores;
    }

    const shouldCreateDefaultFolder = resolvedConfig.mode === "default" && !resolvedShorthand?.enabled;
    let contentFolder: string | null = null;
    if (resolvedShorthand?.enabled) {
      contentFolder = resolvedShorthand.overrides;
    } else if (shouldCreateDefaultFolder) {
      const firstJsonStore = Object.values(resolvedConfig.config.stores || {}).find(
        (store) => store.type === "iiif-json"
      );
      contentFolder = firstJsonStore?.path || "./content";
    }

    if (contentFolder) {
      await mkdir(toAbsolutePath(contentFolder), { recursive: true });
    }

    onboardingInfo = {
      enabled: shouldCreateDefaultFolder,
      configMode: resolvedConfig.mode,
      contentFolder,
      shorthand: resolvedShorthand,
      hints: {
        addContent: `Add IIIF JSON files into ${contentFolder || "./content"}`,
        astro: options.source === "astro" ? "iiif({ collection: 'https://example.org/iiif/collection.json' })" : "",
        vite: options.source === "vite" ? "iiifPlugin({ collection: 'https://example.org/iiif/collection.json' })" : "",
      },
    };

    return resolvedConfig;
  }

  async function ensureServer() {
    if (server) {
      return server;
    }
    const configSource = await resolveIiifConfig();
    const { config: _skipConfig, ...restConfigSource } = configSource;
    server = await createServer(configSource.config, {
      configSource: restConfigSource,
      onboarding: onboardingInfo,
    });
    return server;
  }

  function hasBuildableStores(config: IIIFRC) {
    const stores = Object.values(config.stores || {});
    if (!stores.length) {
      return false;
    }

    for (const store of stores) {
      if (store.type === "iiif-remote") {
        if (store.url || (store.urls && store.urls.length > 0)) {
          return true;
        }
      }
      if (store.type === "iiif-json" && store.path && existsSync(store.path)) {
        return true;
      }
    }

    return false;
  }

  function toAbsolutePath(pathToResolve: string) {
    if (isAbsolute(pathToResolve)) {
      return pathToResolve;
    }
    const root = resolvedRoot || process.cwd();
    return resolve(root, pathToResolve);
  }

  function setRoot(rootPath: string | null | undefined) {
    resolvedRoot = rootPath || null;
  }

  async function mountHonoMiddleware(middleware: MiddlewareContainer) {
    const serverInstance = await ensureServer();
    middleware.use(basePath, async (req, res, next) => {
      const honoApp = serverInstance._extra.app;

      if (!honoApp) {
        return next();
      }

      try {
        const protocol = (req.socket as any)?.encrypted ? "https" : "http";
        const hostname = req.headers.host || "localhost";
        const url = new URL(req.url, `${protocol}://${hostname}`);
        const headers = new Headers(req.headers as any);
        headers.set("x-hss-base-path", basePath);

        let body: BodyInit | null | undefined = undefined;
        if (req.method && ["POST", "PUT", "PATCH"].includes(req.method)) {
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(chunk as Buffer);
          }
          if (chunks.length > 0) {
            body = Buffer.concat(chunks);
          }
        }

        const request = new Request(url.toString(), {
          method: req.method || "GET",
          headers,
          body,
        });

        const response = await honoApp.fetch(request);
        res.statusCode = response.status;
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        if (response.body) {
          const arrayBuffer = await response.arrayBuffer();
          res.end(Buffer.from(arrayBuffer));
          return;
        }
        res.end();
      } catch (error) {
        console.error("Error in Hono middleware:", error);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Internal Server Error" }));
      }
    });
  }

  async function maybeRebuildDevOutputOnServerUrlChange(changed: boolean) {
    if (!changed || !didStartDevBuild) {
      return;
    }
    await runQueuedDevBuild();
  }

  async function runQueuedDevBuild() {
    const nextBuild = devBuildQueue.then(async () => {
      const serverInstance = await ensureServer();
      const output = await serverInstance._extra.cachedBuild({ cache: true, emit: true, dev: true });
      if (output?.buildConfig?.buildDir) {
        lastIiifBuildDir = toAbsolutePath(output.buildConfig.buildDir);
      }
    });

    devBuildQueue = nextBuild.then(
      () => undefined,
      () => undefined
    );

    return nextBuild;
  }

  function resolveServerUrl(hostname: string | boolean | undefined, currentPort: number, fallbackPort: number) {
    let configuredHost = typeof hostname === "string" && hostname.length > 0 ? hostname : "localhost";
    let configuredPort = currentPort || fallbackPort;

    if (port) {
      configuredPort = port;
    }
    if (host) {
      configuredHost = host;
    }

    if (configuredHost === "0.0.0.0" || configuredHost === "::") {
      configuredHost = "localhost";
    }

    // URL hostnames with IPv6 literals must be wrapped in brackets.
    const formattedHost =
      configuredHost.includes(":") && !configuredHost.startsWith("[") && !configuredHost.endsWith("]")
        ? `[${configuredHost}]`
        : configuredHost;

    return resolveHostUrl(`http://${formattedHost}:${configuredPort}${basePath}`);
  }

  async function setConfigServerUrl(url: string, options: { rebuildIfDevBuildStarted?: boolean } = {}) {
    const normalizedUrl = normalizeAbsoluteHttpUrl(url);
    if (!normalizedUrl) {
      return false;
    }
    const configSource = await resolveIiifConfig();
    const previousUrl = normalizeAbsoluteHttpUrl(
      typeof configSource.config.server === "string" ? configSource.config.server : configSource.config.server?.url
    );
    if (!configSource.config.server || typeof configSource.config.server !== "object") {
      configSource.config.server = { url: normalizedUrl };
    } else {
      configSource.config.server.url = normalizedUrl;
    }

    const changed = previousUrl !== normalizedUrl;
    if (options.rebuildIfDevBuildStarted) {
      await maybeRebuildDevOutputOnServerUrlChange(changed);
    }
    return changed;
  }

  function resolveBuildServerUrl(configuredUrl: string | undefined) {
    return (
      normalizeAbsoluteHttpUrl(serverUrl) ||
      normalizeAbsoluteHttpUrl(configuredUrl) ||
      normalizeAbsoluteHttpUrl(resolveBuildUrlFromEnv())
    );
  }

  function normalizePath(value: string) {
    return value.replace(/^\/+/, "").replace(/\/+$/, "");
  }

  function getIiifDebugUrl(baseUrl: string) {
    const base = normalizePath(basePath);
    const debugPath = base.length > 0 ? `${base}/_debug` : "_debug";
    return resolveHostUrl(new URL(debugPath, baseUrl).toString());
  }

  async function runBuild(logger?: RuntimeLogger) {
    const configSource = await resolveIiifConfig();
    const configuredServerUrl =
      typeof configSource.config.server === "string" ? configSource.config.server : configSource.config.server?.url;
    const buildServerUrl = resolveBuildServerUrl(configuredServerUrl);
    if (buildServerUrl) {
      await setConfigServerUrl(buildServerUrl);
    }
    if (!hasBuildableStores(configSource.config)) {
      logger?.warn?.(`${chalk.green`✓`}  Skipping iiif build (no buildable stores found)`);
      return null;
    }

    await ensureCacheDirectoryInvalidation(false, logger);
    logger?.info?.(`${chalk.cyan(`iiif-hss v${version}`)} ${chalk.green("building IIIF...")}`);
    const serverInstance = await ensureServer();
    const output = await serverInstance._extra.cachedBuild({ cache: false, emit: true });
    if (output?.buildConfig?.buildDir) {
      lastIiifBuildDir = toAbsolutePath(output.buildConfig.buildDir);
    }
    return lastIiifBuildDir;
  }

  async function copyBuildArtifacts(outDir: string, logger?: RuntimeLogger) {
    if (!copyBuildToOutDir) {
      return { copied: false, reason: "disabled" as const };
    }

    const sourceDir = iiifBuildDir ? toAbsolutePath(iiifBuildDir) : lastIiifBuildDir || toAbsolutePath(".iiif/build");
    if (!existsSync(sourceDir)) {
      logger?.warn?.(`${chalk.bold.white`IIIF`}: Skipping IIIF artifact copy, source missing: ${sourceDir}`);
      return { copied: false, reason: "missing-source" as const, sourceDir };
    }

    const normalizedBaseSubDir = normalizePath(basePath);
    const resolvedOutSubDir = typeof outSubDir === "string" ? normalizePath(outSubDir) : normalizedBaseSubDir;
    const targetOutDir = resolvedOutSubDir ? join(outDir, resolvedOutSubDir) : outDir;
    if (resolve(sourceDir) === resolve(targetOutDir)) {
      return { copied: false, reason: "same-path" as const, sourceDir, outDir: targetOutDir };
    }

    await mkdir(targetOutDir, { recursive: true });
    await cp(sourceDir, targetOutDir, { recursive: true, force: true });
    return { copied: true, sourceDir, outDir: targetOutDir };
  }

  async function startDevSession(logger?: RuntimeLogger) {
    const configSource = await resolveIiifConfig();
    if (!hasBuildableStores(configSource.config)) {
      logger?.warn?.(`${chalk.green`✓`}  Skipping iiif dev build (no buildable stores found)`);
      return;
    }

    await ensureCacheDirectoryInvalidation(true, logger);
    if (!didStartDevBuild) {
      didStartDevBuild = true;
      await runQueuedDevBuild();
    }

    if (!didStartWatch) {
      didStartWatch = true;
      const serverInstance = await ensureServer();
      await serverInstance.request("/watch");
    }
  }

  async function attachDevHotReloadBridge(triggerReload: () => void) {
    if (didAttachHmrBridge) {
      return;
    }

    const serverInstance = await ensureServer();
    const emitter = (serverInstance as any)?._extra?.emitter;
    if (!emitter || typeof emitter.on !== "function") {
      return;
    }

    didAttachHmrBridge = true;

    let pending = false;
    const scheduleReload = () => {
      if (pending) {
        return;
      }
      pending = true;
      setTimeout(() => {
        pending = false;
        triggerReload();
      }, 75);
    };

    emitter.on("file-refresh", scheduleReload);
    emitter.on("full-rebuild", scheduleReload);
  }

  return {
    basePath,
    isEnabled: () => runtimeEnabled,
    setRoot,
    toAbsolutePath,
    resolveIiifConfig,
    ensureServer,
    mountHonoMiddleware,
    resolveServerUrl,
    setConfigServerUrl,
    getIiifDebugUrl,
    runBuild,
    copyBuildArtifacts,
    startDevSession,
    attachDevHotReloadBridge,
    getOnboardingInfo: () => onboardingInfo,
  };
}
