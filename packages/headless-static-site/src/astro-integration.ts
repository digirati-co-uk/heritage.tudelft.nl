import { relative } from "node:path";
import { cwd } from "node:process";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import type { Plugin } from "vite";
import { type IIIFHSSSPluginOptions, createIiifRuntime } from "./integrations/shared-iiif-runtime";

type AstroCommand = "dev" | "build" | "preview" | "sync";

type AstroLogger = {
  info: (message: string) => void;
  warn: (message: string) => void;
};

type AstroIntegrationLike = {
  name: string;
  hooks: Record<string, (options: any) => void | Promise<void>>;
};

function normalizeLoopbackHost(host: string) {
  if (host === "::1" || host === "[::1]" || host === "127.0.0.1") {
    return "localhost";
  }
  return host;
}

function rootToPath(root: unknown) {
  if (root instanceof URL) {
    return fileURLToPath(root);
  }
  if (typeof root === "string") {
    return root;
  }
  return null;
}

/**
 * Astro integration for iiif-hss.
 */
export function iiifAstro(options: IIIFHSSSPluginOptions = {}): AstroIntegrationLike {
  const runtime = createIiifRuntime(options);
  let command: AstroCommand | null = null;
  let mode: string | null = null;
  let didRunBuild = false;
  let didCopyArtifacts = false;

  function createPreviewPlugin(logger: AstroLogger): Plugin {
    return {
      name: "iiif-hss-astro-preview",
      async configurePreviewServer(previewServer) {
        if (!runtime.isEnabled()) return;

        runtime.setRoot(previewServer.config.root);
        const previewHost = previewServer.config.preview?.host;
        const previewPort = previewServer.config.preview?.port || 4321;
        const previewUrl = runtime.resolveServerUrl(previewHost, previewPort, 4321);
        await runtime.setConfigServerUrl(previewUrl);
        await runtime.mountHonoMiddleware(previewServer.middlewares as any);
        logger.info(`${chalk.green`✓`} IIIF preview middleware mounted at ${runtime.basePath}`);
      },
    };
  }

  return {
    name: "iiif-hss-astro",
    hooks: {
      "astro:config:setup": async ({
        command: astroCommand,
        config,
        isRestart,
        updateConfig,
        addWatchFile,
        logger,
      }) => {
        command = astroCommand as AstroCommand;
        runtime.setRoot(rootToPath(config.root));

        if (!runtime.isEnabled()) {
          return;
        }

        if (command === "preview") {
          updateConfig({
            vite: {
              plugins: [createPreviewPlugin(logger)],
            },
          });
        }

        if (isRestart) {
          return;
        }
        const configSource = await runtime.resolveIiifConfig();
        for (const watchPath of configSource.watchPaths || []) {
          addWatchFile(watchPath.path);
        }
      },

      "astro:config:done": async ({ config }) => {
        runtime.setRoot(rootToPath(config.root));
        mode = (config as any)?.mode || null;
      },

      "astro:server:setup": async ({ server, logger }) => {
        if (!runtime.isEnabled()) return;
        if (command !== "dev") return;

        runtime.setRoot(server.config.root);
        const devHost = server.config.server?.host || "localhost";
        const devPort = server.config.server?.port || 4321;
        const devUrl = runtime.resolveServerUrl(devHost, devPort, 4321);
        await runtime.setConfigServerUrl(devUrl);
        await runtime.mountHonoMiddleware(server.middlewares as any);
        await runtime.startDevSession({
          warn: (message) => logger.warn(message),
        });
      },

      "astro:server:start": async ({ address, logger }) => {
        if (!runtime.isEnabled()) return;
        if (command !== "dev") return;

        const resolvedHost = normalizeLoopbackHost(address?.address || "localhost");
        const devUrl = runtime.resolveServerUrl(resolvedHost, address?.port || 4321, 4321);
        await runtime.setConfigServerUrl(devUrl);
        logger.info(`IIIF: ${runtime.getIiifDebugUrl(devUrl)}`);
      },

      "astro:build:start": async ({ logger }) => {
        if (!runtime.isEnabled()) return;
        if (command !== "build") return;
        if (mode === "test" || didRunBuild) return;

        didRunBuild = true;
        await runtime.runBuild({
          info: (message) => logger.info(message),
          warn: (message) => logger.warn(message),
        });
      },

      "astro:build:done": async ({ dir, logger }) => {
        if (!runtime.isEnabled()) return;
        if (command !== "build") return;
        if (mode === "test" || didCopyArtifacts) return;

        didCopyArtifacts = true;
        const outDir = fileURLToPath(dir);
        const copyResult = await runtime.copyBuildArtifacts(outDir, {
          warn: (message) => logger.warn(message),
        });
        if (!copyResult.copied || !copyResult.outDir) {
          return;
        }
        logger.info(`${chalk.green`✓`} IIIF built to ${chalk.gray(`/${relative(cwd(), copyResult.outDir)}`)}`);
      },
    },
  };
}

export default iiifAstro;
