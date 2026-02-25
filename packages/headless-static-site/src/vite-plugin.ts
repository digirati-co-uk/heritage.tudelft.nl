import { existsSync } from "node:fs";
import type { Plugin } from "vite";
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
}

/**
 * Vite plugin for integrating Hono server
 */
export function iiifPlugin(options: IIIFHSSSPluginOptions = {}): Plugin {
  const { basePath = "/iiif", port, host, enabled, config: customConfig, configFile } = options;
  const isVitest = typeof process !== "undefined" && Boolean(process.env.VITEST);
  const pluginEnabled = enabled ?? !isVitest;

  let server: Awaited<ReturnType<typeof createServer>> | null = null;
  let resolvedViteCommand: "serve" | "build" | null = null;
  let resolvedViteMode: string | null = null;
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

  return {
    name: "iiif-hss",
    configResolved(resolvedConfig) {
      resolvedViteCommand = resolvedConfig.command;
      resolvedViteMode = resolvedConfig.mode;
    },
    async configureServer(viteDevServer) {
      if (!pluginEnabled) return;

      const configSource = await resolveIiifConfig();
      const config = configSource.config;

      // Try to get the actual host/port from the resolved server config
      // Fall back to the httpServer address if available, or defaults
      let devHost = viteDevServer.config.server?.host || "localhost";
      let devPort = viteDevServer.config.server?.port || 5173;

      // If the server is already listening, get the actual address
      if (viteDevServer.httpServer?.listening) {
        const address = viteDevServer.httpServer.address();
        if (address && typeof address === "object") {
          devHost = address.address === "::" ? "localhost" : address.address || devHost;
          devPort = address.port || devPort;
        }
      }

      if (port) {
        devPort = port;
      }
      if (host) {
        devHost = host;
      }

      // Convert 0.0.0.0 to localhost for URL construction
      if (devHost === "0.0.0.0") {
        devHost = "localhost";
      }

      const devUrl = `http://${devHost}:${devPort}${basePath}`;
      config.server = config.server || { url: devUrl };
      config.server.url = devUrl;

      const serverInstance = await ensureServer();

      console.log(`🔥 IIIF server started at ${basePath}`);

      // Add middleware to handle API requests
      viteDevServer.middlewares.use(basePath, async (req, res, next) => {
        const honoApp = serverInstance._extra.app;

        if (!honoApp) {
          return next();
        }

        try {
          // Convert Node.js request to Fetch API request
          const protocol = (req.socket as any)?.encrypted ? "https" : "http";
          const host = req.headers.host || "localhost";
          const url = new URL(req.url!, `${protocol}://${host}`);

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
                (contentType.includes("multipart/form-data") ||
                  contentType.includes("application/x-www-form-urlencoded"))
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
            headers: req.headers as any,
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
    },

    async buildStart() {
      if (!pluginEnabled) return;
      if (resolvedViteMode === "test" || resolvedViteCommand !== "build") return;

      const configSource = await resolveIiifConfig();
      if (!hasBuildableStores(configSource.config)) {
        console.warn("🔥 Hono server plugin: Skipping iiif build (no buildable stores found)");
        return;
      }

      console.log("🔥 Hono server plugin: Building iiif");
      const serverInstance = await ensureServer();
      await serverInstance._extra.cachedBuild({ cache: false, emit: true });
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
