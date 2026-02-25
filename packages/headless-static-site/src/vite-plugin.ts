import { existsSync } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { cwd } from "node:process";
import chalk from "chalk";
import type { Plugin } from "vite";
import { version } from "../package.json";
import { createServer } from "./create-server";
import { DEFAULT_CONFIG, type IIIFRC, getCustomConfigSource, resolveConfigSource } from "./util/get-config";

interface IIIFHSSSPluginOptions {
  /**
   * Base path for the Hono server routes
   */
  basePath?: string;

  /**
   * Path to iiifrc
   */
  configFile?: string;

  /**
   * Inline config overrides.
   */
  config?: Omit<IIIFRC, "stores"> & { stores?: IIIFRC["stores"] };

  enabled?: boolean;

  /**
   * Override port (e.g. Astro)
   */
  port?: number;

  /**
   * Override host
   */
  host?: string;

  /**
   * Copy generated IIIF build output into Vite outDir after build.
   */
  copyBuildToOutDir?: boolean;

  /**
   * Override IIIF build source directory used for copy.
   */
  iiifBuildDir?: string;

  /**
   * Optional sub-directory inside Vite outDir.
   */
  outSubDir?: string;
}

/**
 * Vite plugin for integrating Hono server
 */
export function iiifPlugin(options: IIIFHSSSPluginOptions = {}): Plugin {
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
  const pluginEnabled = enabled ?? !isVitest;

  let server: Awaited<ReturnType<typeof createServer>> | null = null;
  let resolvedViteCommand: "serve" | "build" | null = null;
  let resolvedViteMode: string | null = null;
  let resolvedViteRoot: string | null = null;
  let resolvedOutDir: string | null = null;
  let lastIiifBuildDir: string | null = null;
  let resolvedConfig: Awaited<ReturnType<typeof resolveConfigSource>> | null = null;
  let didPatchPrintUrls = false;

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
    const root = resolvedViteRoot || process.cwd();
    return resolve(root, pathToResolve);
  }

  async function mountHonoMiddleware(
    middleware: {
      use: (path: string, handler: (req: any, res: any, next: () => void) => Promise<void>) => void;
    },
    serverInstance: Awaited<ReturnType<typeof createServer>>
  ) {
    middleware.use(basePath, async (req, res, next) => {
      const honoApp = serverInstance._extra.app;

      if (!honoApp) {
        return next();
      }

      try {
        // Convert Node.js request to Fetch API request
        const protocol = (req.socket as any)?.encrypted ? "https" : "http";
        const host = req.headers.host || "localhost";
        const url = new URL(req.url!, `${protocol}://${host}`);
        const headers = new Headers(req.headers as any);
        headers.set("x-hss-base-path", basePath);

        // Handle request body for POST/PUT/PATCH requests (including form data)
        let body: BodyInit | null | undefined = undefined;

        if (req.method && ["POST", "PUT", "PATCH"].includes(req.method)) {
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(chunk as Buffer);
          }

          if (chunks.length > 0) {
            const buffer = Buffer.concat(chunks);
            const contentType = req.headers["content-type"] || req.headers["Content-Type"];

            // For multipart/form-data and application/x-www-form-urlencoded
            // we pass through the raw Buffer so the Fetch API / Hono can
            // parse it correctly based on the Content-Type header.
            if (
              typeof contentType === "string" &&
              (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded"))
            ) {
              body = buffer;
            } else {
              // For JSON, text, etc. it's also fine to pass the Buffer; the
              // Fetch API will treat it as a Uint8Array/ReadableStream source.
              body = buffer;
            }
          }
        }

        const request = new Request(url.toString(), {
          method: req.method || "GET",
          headers,
          body,
        });

        // Get response from Hono
        const response = await honoApp.fetch(request);

        // Convert Fetch API response to Node.js response
        res.statusCode = response.status;

        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });

        if (response.body) {
          const arrayBuffer = await response.arrayBuffer();
          res.end(Buffer.from(arrayBuffer));
        } else {
          res.end();
        }
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

    return `http://${configuredHost}:${configuredPort}${basePath}`;
  }

  function normalizePath(value: string) {
    return value.replace(/^\/+/, "").replace(/\/+$/, "");
  }

  function getIiifDebugUrl(baseUrl: string) {
    const base = normalizePath(basePath);
    const debugPath = base.length > 0 ? `${base}/_debug` : "_debug";
    return new URL(debugPath, baseUrl).toString();
  }

  function patchPrintUrls(server: {
    printUrls?: () => void;
    resolvedUrls?: { local?: string[]; network?: string[] } | null;
  }) {
    if (didPatchPrintUrls || typeof server.printUrls !== "function") {
      return;
    }

    const originalPrintUrls = server.printUrls.bind(server);
    server.printUrls = () => {
      originalPrintUrls();
      const localUrl = server.resolvedUrls?.local?.[0] || server.resolvedUrls?.network?.[0];
      if (localUrl) {
        console.log(`  ${chalk.green`➜`}  ${chalk.white.bold`IIIF`}:    ${chalk.cyan(getIiifDebugUrl(localUrl))}`);
      }
    };
    didPatchPrintUrls = true;
  }

  return {
    name: "iiif-hss",
    configResolved(resolvedConfig) {
      resolvedViteCommand = resolvedConfig.command;
      resolvedViteMode = resolvedConfig.mode;
      resolvedViteRoot = resolvedConfig.root;
      resolvedOutDir = toAbsolutePath(resolvedConfig.build?.outDir || "dist");
    },
    async configureServer(viteDevServer) {
      if (!pluginEnabled) return;

      const configSource = await resolveIiifConfig();
      const config = configSource.config;
      patchPrintUrls(viteDevServer as any);

      // Try to get the actual host/port from the resolved server config
      // Fall back to the httpServer address if available, or defaults
      let devHost: string | boolean | undefined = viteDevServer.config.server?.host || "localhost";
      let devPort = viteDevServer.config.server?.port || 5173;

      // If the server is already listening, get the actual address
      if (viteDevServer.httpServer?.listening) {
        const address = viteDevServer.httpServer.address();
        if (address && typeof address === "object") {
          devHost = address.address === "::" ? "localhost" : address.address || devHost;
          devPort = address.port || devPort;
        }
      }

      const devUrl = resolveServerUrl(devHost, devPort, 5173);
      config.server = config.server || { url: devUrl };
      config.server.url = devUrl;

      const serverInstance = await ensureServer();
      await mountHonoMiddleware(viteDevServer.middlewares as any, serverInstance);
    },

    async configurePreviewServer(previewServer) {
      if (!pluginEnabled) return;
      if (resolvedViteMode === "test") return;

      const configSource = await resolveIiifConfig();
      const config = configSource.config;

      const previewHost = previewServer.config.preview?.host;
      const previewPort = previewServer.config.preview?.port || 4173;

      const previewUrl = resolveServerUrl(previewHost, previewPort, 4173);
      config.server = config.server || { url: previewUrl };
      config.server.url = previewUrl;

      const serverInstance = await ensureServer();
      await mountHonoMiddleware(previewServer.middlewares as any, serverInstance);

      console.log(`${chalk.green`✓`} IIIF preview middleware mounted at ${basePath}`);
    },

    async buildStart() {
      if (!pluginEnabled) return;
      if (resolvedViteMode === "test" || resolvedViteCommand !== "build") return;

      const configSource = await resolveIiifConfig();
      if (!hasBuildableStores(configSource.config)) {
        console.warn(`${chalk.green`✓`}  Skipping iiif build (no buildable stores found)`);
        return;
      }

      console.log(`${chalk.cyan(`iiif-hss v${version}`)} ${chalk.green("building IIIF...")}`);
      const serverInstance = await ensureServer();
      const output = await serverInstance._extra.cachedBuild({ cache: false, emit: true });
      if (output?.buildConfig?.buildDir) {
        lastIiifBuildDir = toAbsolutePath(output.buildConfig.buildDir);
      }
    },

    async closeBundle() {
      if (!pluginEnabled) return;
      if (resolvedViteMode === "test" || resolvedViteCommand !== "build") return;
      if (!copyBuildToOutDir) return;

      const sourceDir = iiifBuildDir ? toAbsolutePath(iiifBuildDir) : lastIiifBuildDir || toAbsolutePath(".iiif/build");
      if (!existsSync(sourceDir)) {
        console.warn(`${chalk.bold.white`IIIF`}: Skipping IIIF artifact copy, source missing: ${sourceDir}`);
        return;
      }

      if (!resolvedOutDir) {
        console.warn(`${chalk.bold.white`IIIF`}: Skipping IIIF artifact copy, Vite outDir unavailable`);
        return;
      }

      const outDir = outSubDir ? join(resolvedOutDir, outSubDir) : resolvedOutDir;
      if (resolve(sourceDir) === resolve(outDir)) {
        return;
      }

      await mkdir(outDir, { recursive: true });
      await cp(sourceDir, outDir, { recursive: true, force: true });
      // List all the IIIF.
      console.log(`${chalk.green`✓`} IIIF built to ${chalk.gray(`/${relative(cwd(), outDir)}`)}`);
    },

    buildEnd() {
      // Cleanup after build
      // if (enabled) {
      // console.log("🔥 Hono server plugin: Build completed");
      // }
    },
  };
}

/**
 * Function that can be run during the Vite build process
 * Left empty for now as requested
 */
export function buildTimeFunction() {
  // TODO: Implement build-time functionality
  console.log("🔥 Build-time function called - implement your logic here");
}

export default iiifPlugin;
