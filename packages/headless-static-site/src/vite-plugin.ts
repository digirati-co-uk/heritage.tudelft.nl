import { relative } from "node:path";
import { cwd } from "node:process";
import chalk from "chalk";
import type { Plugin } from "vite";
import { type IIIFHSSSPluginOptions, createIiifRuntime } from "./integrations/shared-iiif-runtime";

/**
 * Vite plugin for integrating Hono server.
 */
export function iiifPlugin(options: IIIFHSSSPluginOptions = {}): Plugin {
  const runtime = createIiifRuntime(options);
  let resolvedViteCommand: "serve" | "build" | null = null;
  let resolvedViteMode: string | null = null;
  let resolvedOutDir: string | null = null;
  let didPatchPrintUrls = false;

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
        console.log(`  ${chalk.green`➜`}  ${chalk.white.bold`IIIF`}:    ${chalk.cyan(runtime.getIiifDebugUrl(localUrl))}`);
      }
    };
    didPatchPrintUrls = true;
  }

  return {
    name: "iiif-hss",
    configResolved(resolvedConfig) {
      resolvedViteCommand = resolvedConfig.command;
      resolvedViteMode = resolvedConfig.mode;
      runtime.setRoot(resolvedConfig.root);
      resolvedOutDir = runtime.toAbsolutePath(resolvedConfig.build?.outDir || "dist");
    },
    async configureServer(viteDevServer) {
      if (!runtime.isEnabled()) return;

      patchPrintUrls(viteDevServer as any);

      let devHost: string | boolean | undefined = viteDevServer.config.server?.host || "localhost";
      let devPort = viteDevServer.config.server?.port || 5173;
      if (viteDevServer.httpServer?.listening) {
        const address = viteDevServer.httpServer.address();
        if (address && typeof address === "object") {
          devHost = address.address === "::" ? "localhost" : address.address || devHost;
          devPort = address.port || devPort;
        }
      }

      const devUrl = runtime.resolveServerUrl(devHost, devPort, 5173);
      await runtime.setConfigServerUrl(devUrl);
      await runtime.mountHonoMiddleware(viteDevServer.middlewares as any);
    },

    async configurePreviewServer(previewServer) {
      if (!runtime.isEnabled()) return;
      if (resolvedViteMode === "test") return;

      const previewHost = previewServer.config.preview?.host;
      const previewPort = previewServer.config.preview?.port || 4173;
      const previewUrl = runtime.resolveServerUrl(previewHost, previewPort, 4173);
      await runtime.setConfigServerUrl(previewUrl);
      await runtime.mountHonoMiddleware(previewServer.middlewares as any);
      console.log(`${chalk.green`✓`} IIIF preview middleware mounted at ${runtime.basePath}`);
    },

    async buildStart() {
      if (!runtime.isEnabled()) return;
      if (resolvedViteMode === "test" || resolvedViteCommand !== "build") return;
      await runtime.runBuild({
        info: (message) => console.log(message),
        warn: (message) => console.warn(message),
      });
    },

    async closeBundle() {
      if (!runtime.isEnabled()) return;
      if (resolvedViteMode === "test" || resolvedViteCommand !== "build") return;
      if (!resolvedOutDir) {
        console.warn(`${chalk.bold.white`IIIF`}: Skipping IIIF artifact copy, Vite outDir unavailable`);
        return;
      }

      const copyResult = await runtime.copyBuildArtifacts(resolvedOutDir, {
        warn: (message) => console.warn(message),
      });
      if (!copyResult.copied || !copyResult.outDir) {
        return;
      }
      console.log(`${chalk.green`✓`} IIIF built to ${chalk.gray(`/${relative(cwd(), copyResult.outDir)}`)}`);
    },

    buildEnd() {
      // Placeholder hook intentionally left for future build-time cleanup.
    },
  };
}

/**
 * Function that can be run during the Vite build process.
 */
export function buildTimeFunction() {
  console.log("Build-time function called - implement your logic here");
}

export default iiifPlugin;
