import { existsSync } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import chalk from "chalk";
import { version } from "../../package.json";
import { createServer } from "../create-server";
import { DEFAULT_CONFIG, type IIIFRC, getCustomConfigSource, resolveConfigSource } from "../util/get-config";

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
}

type MiddlewareContainer = {
  use: (path: string, handler: (req: any, res: any, next: () => void) => Promise<void>) => void;
};

type RuntimeLogger = {
  info?: (message: string) => void;
  warn?: (message: string) => void;
};

export function createIiifRuntime(options: IIIFHSSSPluginOptions = {}) {
  const {
    basePath = "/iiif",
    port,
    host,
    enabled,
    copyBuildToOutDir = true,
    iiifBuildDir,
    outSubDir,
    config: customConfig,
    configFile,
  } = options;

  const isVitest = typeof process !== "undefined" && Boolean(process.env.VITEST);
  const runtimeEnabled = enabled ?? !isVitest;

  let server: Awaited<ReturnType<typeof createServer>> | null = null;
  let resolvedRoot: string | null = null;
  let lastIiifBuildDir: string | null = null;
  let resolvedConfig: Awaited<ReturnType<typeof resolveConfigSource>> | null = null;

  async function resolveIiifConfig() {
    if (resolvedConfig) {
      return resolvedConfig;
    }
    resolvedConfig = customConfig
      ? getCustomConfigSource(customConfig as IIIFRC)
      : await resolveConfigSource(configFile);
    if (!resolvedConfig.config.stores) {
      resolvedConfig.config.stores = DEFAULT_CONFIG.stores;
    }
    return resolvedConfig;
  }

  async function ensureServer() {
    if (server) {
      return server;
    }
    const configSource = await resolveIiifConfig();
    const { config: _skipConfig, ...restConfigSource } = configSource;
    server = await createServer(configSource.config, { configSource: restConfigSource });
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

    return `http://${formattedHost}:${configuredPort}${basePath}`;
  }

  async function setConfigServerUrl(url: string) {
    const configSource = await resolveIiifConfig();
    configSource.config.server = configSource.config.server || { url };
    configSource.config.server.url = url;
  }

  function normalizePath(value: string) {
    return value.replace(/^\/+/, "").replace(/\/+$/, "");
  }

  function getIiifDebugUrl(baseUrl: string) {
    const base = normalizePath(basePath);
    const debugPath = base.length > 0 ? `${base}/_debug` : "_debug";
    return new URL(debugPath, baseUrl).toString();
  }

  async function runBuild(logger?: RuntimeLogger) {
    const configSource = await resolveIiifConfig();
    if (!hasBuildableStores(configSource.config)) {
      logger?.warn?.(`${chalk.green`✓`}  Skipping iiif build (no buildable stores found)`);
      return null;
    }

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

    const targetOutDir = outSubDir ? join(outDir, outSubDir) : outDir;
    if (resolve(sourceDir) === resolve(targetOutDir)) {
      return { copied: false, reason: "same-path" as const, sourceDir, outDir: targetOutDir };
    }

    await mkdir(targetOutDir, { recursive: true });
    await cp(sourceDir, targetOutDir, { recursive: true, force: true });
    return { copied: true, sourceDir, outDir: targetOutDir };
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
  };
}
