import { existsSync, readFileSync } from "node:fs";
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

type ToolbarHelpers = {
  send: (event: string, payload: unknown) => void;
  on: (event: string, callback: (payload: any) => void) => void;
  onAppInitialized?: (appId: string, callback: () => void) => void;
  onAppToggled?: (appId: string, callback: (options: { state: boolean }) => void) => void;
};

type IiifServerLike = {
  request: (input: string, init?: RequestInit) => Promise<Response>;
};

export type IiifAstroToolbarOptions = {
  enabled?: boolean;
  name?: string;
};

export type IiifAstroOptions = IIIFHSSSPluginOptions & {
  toolbar?: boolean | IiifAstroToolbarOptions;
};

const TOOLBAR_APP_ID = "iiif-hss-control-center";
const TOOLBAR_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18"/><path d="M3 7h18"/><path d="M3 17h18"/><circle cx="8" cy="7" r="1.3"/><circle cx="16" cy="12" r="1.3"/><circle cx="11" cy="17" r="1.3"/></svg>`;
const TOOLBAR_EVENTS = {
  actionResult: `${TOOLBAR_APP_ID}:action-result`,
  error: `${TOOLBAR_APP_ID}:error`,
  healthCheck: `${TOOLBAR_APP_ID}:health-check`,
  healthResult: `${TOOLBAR_APP_ID}:health-result`,
  inspectPath: `${TOOLBAR_APP_ID}:inspect-path`,
  inspectSlug: `${TOOLBAR_APP_ID}:inspect-slug`,
  requestSnapshot: `${TOOLBAR_APP_ID}:request-snapshot`,
  resource: `${TOOLBAR_APP_ID}:resource`,
  runAction: `${TOOLBAR_APP_ID}:run-action`,
  snapshot: `${TOOLBAR_APP_ID}:snapshot`,
} as const;
let cachedToolbarIcon: string | null = null;

function resolveToolbarIcon() {
  if (cachedToolbarIcon) {
    return cachedToolbarIcon;
  }

  const candidateUrls = [
    new URL("./astro/iiif.svg", import.meta.url),
    new URL("../src/astro/iiif.svg", import.meta.url),
  ];
  for (const candidateUrl of candidateUrls) {
    try {
      const path = fileURLToPath(candidateUrl);
      if (!existsSync(path)) {
        continue;
      }
      const loaded = readFileSync(path, "utf-8").trim();
      if (!loaded) {
        continue;
      }
      cachedToolbarIcon = loaded;
      return cachedToolbarIcon;
    } catch (error) {
      // Ignore and continue to fallback.
    }
  }

  cachedToolbarIcon = TOOLBAR_ICON;
  return cachedToolbarIcon;
}

function normalizeLoopbackHost(host: string) {
  if (host === "::1" || host === "[::1]" || host === "127.0.0.1") {
    return "localhost";
  }
  return host;
}

function trimSlashes(value: string) {
  return value.replace(/^\/+/, "").replace(/\/+$/, "");
}

function normalizePathname(pathname: string) {
  const withoutQuery = pathname.split("?")[0]?.split("#")[0] || "";
  return withoutQuery || "/";
}

function normalizeSlug(value: string) {
  return trimSlashes(value).replace(/\/(manifest|collection)\.json$/i, "");
}

function encodeSlugPath(slug: string) {
  return normalizeSlug(slug)
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function normalizeBasePath(basePath: string) {
  const normalized = `/${trimSlashes(basePath || "/")}`.replace(/\/+/g, "/");
  return normalized === "/" ? "" : normalized;
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

function hasResolvedResource(resource: any) {
  if (!resource || typeof resource !== "object") {
    return false;
  }
  return Boolean(
    resource.type ||
      resource.source ||
      resource.resource ||
      resource.links?.json ||
      resource.links?.localJson ||
      resource.links?.remoteJson
  );
}

function candidateSlugsFromPath(pathname: string) {
  const normalizedPath = normalizePathname(pathname);
  const decodedPath = safeDecode(normalizedPath);
  const cleanedPath = trimSlashes(decodedPath);
  const noHtml = cleanedPath.replace(/\.html?$/i, "");
  const noIiifSuffix = noHtml.replace(/\/(manifest|collection)\.json$/i, "");
  const candidates = new Set<string>();

  if (cleanedPath) {
    candidates.add(cleanedPath);
  }
  if (noHtml) {
    candidates.add(noHtml);
  }
  if (noIiifSuffix) {
    candidates.add(noIiifSuffix);
  }

  const markers = ["manifests/", "manifest/", "collections/", "collection/", "items/"];
  for (const marker of markers) {
    const markerIndex = noIiifSuffix.indexOf(marker);
    if (markerIndex === -1) {
      continue;
    }
    const suffix = noIiifSuffix.slice(markerIndex + marker.length);
    if (suffix) {
      candidates.add(suffix);
    }
  }

  const segments = noIiifSuffix.split("/").filter(Boolean);
  for (let index = 1; index < segments.length; index += 1) {
    candidates.add(segments.slice(index).join("/"));
  }

  return [...candidates].map((value) => normalizeSlug(value)).filter(Boolean);
}

function toRequestPath(pathOrUrl: string | null | undefined) {
  if (!pathOrUrl || typeof pathOrUrl !== "string") {
    return null;
  }
  if (/^https?:\/\//i.test(pathOrUrl)) {
    try {
      const parsed = new URL(pathOrUrl);
      return `${parsed.pathname}${parsed.search}`;
    } catch (error) {
      return null;
    }
  }
  const trimmed = pathOrUrl.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

async function requestJson(server: IiifServerLike, input: string, init?: RequestInit) {
  const response = await server.request(input, init);
  if (!response.ok) {
    const reason = await response.text().catch(() => "");
    throw new Error(`IIIF toolbar request failed (${response.status}) for ${input}${reason ? `: ${reason}` : ""}`);
  }
  return response.json();
}

async function requestSiteSnapshot(server: IiifServerLike, basePath: string) {
  const [site, config] = await Promise.all([requestJson(server, "/_debug/api/site"), requestJson(server, "/config")]);
  const normalizedBasePath = normalizeBasePath(basePath);
  const debugBasePath = normalizedBasePath ? `${normalizedBasePath}/_debug` : "/_debug";
  return {
    basePath: normalizedBasePath || "/",
    config: {
      isWatching: Boolean(config?.isWatching),
      pendingFiles: Array.isArray(config?.pendingFiles) ? config.pendingFiles : [],
    },
    debugBasePath,
    site,
    timestamp: new Date().toISOString(),
  };
}

async function requestResource(server: IiifServerLike, slug: string) {
  const encodedSlug = encodeSlugPath(slug);
  if (!encodedSlug) {
    return null;
  }
  try {
    return await requestJson(server, `/_debug/api/resource/${encodedSlug}`);
  } catch (error) {
    return null;
  }
}

async function resolveFromPath(server: IiifServerLike, pathname: string, knownSlugs: Set<string>) {
  const candidates = candidateSlugsFromPath(pathname);
  for (const candidate of candidates) {
    if (knownSlugs.has(candidate)) {
      const resource = await requestResource(server, candidate);
      if (resource && hasResolvedResource(resource)) {
        return {
          candidateSlugs: candidates,
          resolvedSlug: candidate,
          resource,
        };
      }
    }
  }

  for (const candidate of candidates) {
    const resource = await requestResource(server, candidate);
    if (resource && hasResolvedResource(resource)) {
      return {
        candidateSlugs: candidates,
        resolvedSlug: candidate,
        resource,
      };
    }
  }

  return {
    candidateSlugs: candidates,
    resolvedSlug: null,
    resource: null,
  };
}

async function probeRemoteUrl(url: string) {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    let response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
      });
    }
    return {
      durationMs: Date.now() - start,
      ok: response.ok,
      status: response.status,
      url,
    };
  } catch (error) {
    return {
      durationMs: Date.now() - start,
      error: toErrorMessage(error),
      ok: false,
      status: null,
      url,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function buildHealthReport(server: IiifServerLike, resource: any) {
  const checks: Array<{ id: string; label: string; status: "pass" | "warn" | "fail"; detail: string }> = [];
  const sourceType = resource?.source?.type || null;

  checks.push({
    detail: sourceType ? `Source type: ${sourceType}` : "No source type provided in sitemap entry.",
    id: "source",
    label: "Source mapping",
    status: sourceType ? "pass" : "fail",
  });

  if (sourceType === "disk") {
    const diskPath = resource?.diskPath || resource?.source?.path || null;
    const hasDiskPath = typeof diskPath === "string" && diskPath.length > 0;
    const exists = hasDiskPath ? existsSync(diskPath) : false;
    checks.push({
      detail: hasDiskPath ? diskPath : "No disk path available.",
      id: "disk-source",
      label: "Disk source path",
      status: hasDiskPath ? (exists ? "pass" : "fail") : "warn",
    });
  }

  const localJsonPath = toRequestPath(resource?.links?.localJson);
  if (localJsonPath) {
    try {
      const localResponse = await server.request(localJsonPath);
      checks.push({
        detail: `${localResponse.status} ${localJsonPath}`,
        id: "local-json",
        label: "Local JSON availability",
        status: localResponse.ok ? "pass" : "fail",
      });
    } catch (error) {
      checks.push({
        detail: toErrorMessage(error),
        id: "local-json",
        label: "Local JSON availability",
        status: "fail",
      });
    }
  } else {
    checks.push({
      detail: "No local JSON path available.",
      id: "local-json",
      label: "Local JSON availability",
      status: "warn",
    });
  }

  const remoteUrl =
    typeof resource?.source?.url === "string" && resource.source.url
      ? resource.source.url
      : typeof resource?.links?.remoteJson === "string"
        ? resource.links.remoteJson
        : null;
  if (remoteUrl) {
    const remoteResult = await probeRemoteUrl(remoteUrl);
    checks.push({
      detail: remoteResult.ok
        ? `HTTP ${remoteResult.status} in ${remoteResult.durationMs}ms`
        : `${remoteResult.error || `HTTP ${remoteResult.status}`} in ${remoteResult.durationMs}ms`,
      id: "remote-json",
      label: "Remote JSON reachability",
      status: remoteResult.ok ? "pass" : "fail",
    });
  } else {
    checks.push({
      detail: "No remote URL configured.",
      id: "remote-json",
      label: "Remote JSON reachability",
      status: "warn",
    });
  }

  const failures = checks.filter((check) => check.status === "fail").length;
  const warnings = checks.filter((check) => check.status === "warn").length;

  return {
    checks,
    slug: resource?.slug || null,
    summary: {
      failures,
      ok: failures === 0,
      warnings,
    },
    timestamp: new Date().toISOString(),
  };
}

async function runToolbarAction(server: IiifServerLike, action: string) {
  if (action === "rebuild") {
    const rebuildResult = await requestJson(
      server,
      "/build?cache=true&emit=true&enrich=true&extract=true&generate=true"
    );
    return {
      action,
      emittedStats: rebuildResult?.emitted?.stats || null,
      status: "done",
    };
  }

  if (action === "save") {
    const saveResult = await requestJson(server, "/build/save");
    return {
      action,
      ...saveResult,
      status: "done",
    };
  }

  if (action === "toggle-watch") {
    const config = await requestJson(server, "/config");
    const currentlyWatching = Boolean(config?.isWatching);
    const toggleResult = await requestJson(server, currentlyWatching ? "/unwatch" : "/watch");
    return {
      action,
      ...toggleResult,
      status: "done",
      watching: !currentlyWatching,
    };
  }

  throw new Error(`Unsupported toolbar action: ${action}`);
}

function normalizeToolbarOptions(toolbar: IiifAstroOptions["toolbar"]) {
  if (toolbar === false) {
    return { enabled: false, name: "IIIF HSS" };
  }

  if (toolbar === true || typeof toolbar === "undefined") {
    return { enabled: true, name: "IIIF HSS" };
  }

  return {
    enabled: toolbar.enabled ?? true,
    name: toolbar.name?.trim() || "IIIF HSS",
  };
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
export function iiifAstro(options: IiifAstroOptions = {}): AstroIntegrationLike {
  const { toolbar: toolbarOption, ...runtimeOptions } = options;
  const toolbar = normalizeToolbarOptions(toolbarOption);
  const runtime = createIiifRuntime({ ...runtimeOptions, source: "astro" });
  let command: AstroCommand | null = null;
  let mode: string | null = null;
  let didRunBuild = false;
  let didCopyArtifacts = false;
  let didSetupToolbarBridge = false;

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
        addDevToolbarApp,
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

        if (command === "dev" && toolbar.enabled && typeof addDevToolbarApp === "function") {
          addDevToolbarApp({
            entrypoint: new URL("../src/astro/dev-toolbar-app.js", import.meta.url),
            icon: resolveToolbarIcon(),
            id: TOOLBAR_APP_ID,
            name: toolbar.name,
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

      "astro:server:setup": async ({ server, logger, toolbar: toolbarHelpers }) => {
        if (!runtime.isEnabled()) return;
        if (command !== "dev") return;

        runtime.setRoot(server.config.root);
        const devHost = server.config.server?.host || "localhost";
        const devPort = server.config.server?.port || 4321;
        const devUrl = runtime.resolveServerUrl(devHost, devPort, 4321);
        await runtime.setConfigServerUrl(devUrl);
        await runtime.mountHonoMiddleware(server.middlewares as any);
        await runtime.attachDevHotReloadBridge(() => {
          if (!server.ws || typeof server.ws.send !== "function") {
            return;
          }
          server.ws.send({ type: "full-reload", path: "*" });
        });
        runtime
          .startDevSession({
            warn: (message) => {
              if (logger?.warn) {
                logger.warn(message);
                return;
              }
              console.warn(message);
            },
          })
          .catch((error) => {
            if (logger?.warn) {
              logger.warn(String(error));
              return;
            }
            console.warn(error);
          });

        if (!toolbar.enabled) {
          return;
        }
        if (didSetupToolbarBridge || !toolbarHelpers || typeof toolbarHelpers.on !== "function") {
          return;
        }
        didSetupToolbarBridge = true;

        const iiifServer = (await runtime.ensureServer()) as IiifServerLike;
        const toolbarApi = toolbarHelpers as ToolbarHelpers;

        const sendError = (context: string, error: unknown) => {
          const message = toErrorMessage(error);
          toolbarApi.send(TOOLBAR_EVENTS.error, { context, message, timestamp: new Date().toISOString() });
          if (logger?.warn) {
            logger.warn(`IIIF toolbar (${context}): ${message}`);
          }
        };

        const sendSnapshot = async () => {
          const snapshot = await requestSiteSnapshot(iiifServer, runtime.basePath);
          toolbarApi.send(TOOLBAR_EVENTS.snapshot, snapshot);
          return snapshot;
        };

        toolbarApi.on(TOOLBAR_EVENTS.requestSnapshot, async () => {
          try {
            await sendSnapshot();
          } catch (error) {
            sendError("request-snapshot", error);
          }
        });

        toolbarApi.on(TOOLBAR_EVENTS.inspectSlug, async (payload) => {
          try {
            const normalizedSlug = normalizeSlug(String(payload?.slug || ""));
            if (!normalizedSlug) {
              toolbarApi.send(TOOLBAR_EVENTS.resource, {
                candidateSlugs: [],
                found: false,
                mode: "slug",
                resource: null,
                resolvedSlug: null,
              });
              return;
            }

            const resource = await requestResource(iiifServer, normalizedSlug);
            toolbarApi.send(TOOLBAR_EVENTS.resource, {
              candidateSlugs: [normalizedSlug],
              found: Boolean(resource && hasResolvedResource(resource)),
              mode: "slug",
              resource,
              resolvedSlug: resource && hasResolvedResource(resource) ? normalizedSlug : null,
            });
          } catch (error) {
            sendError("inspect-slug", error);
          }
        });

        toolbarApi.on(TOOLBAR_EVENTS.inspectPath, async (payload) => {
          try {
            const pathname = typeof payload?.pathname === "string" ? payload.pathname : "/";
            const snapshot = await requestSiteSnapshot(iiifServer, runtime.basePath);
            const knownSlugs = new Set<string>(
              (snapshot.site?.resources || [])
                .map((resource: any) => normalizeSlug(String(resource?.slug || "")))
                .filter(Boolean)
            );
            const resolved = await resolveFromPath(iiifServer, pathname, knownSlugs);

            toolbarApi.send(TOOLBAR_EVENTS.resource, {
              ...resolved,
              found: Boolean(resolved.resource && hasResolvedResource(resolved.resource)),
              mode: "path",
              pathname,
            });
          } catch (error) {
            sendError("inspect-path", error);
          }
        });

        toolbarApi.on(TOOLBAR_EVENTS.runAction, async (payload) => {
          const action = String(payload?.action || "");
          try {
            const result = await runToolbarAction(iiifServer, action);
            const snapshot = await requestSiteSnapshot(iiifServer, runtime.basePath);
            toolbarApi.send(TOOLBAR_EVENTS.actionResult, {
              action,
              ok: true,
              result,
              snapshot,
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            toolbarApi.send(TOOLBAR_EVENTS.actionResult, {
              action,
              error: toErrorMessage(error),
              ok: false,
              timestamp: new Date().toISOString(),
            });
            sendError("run-action", error);
          }
        });

        toolbarApi.on(TOOLBAR_EVENTS.healthCheck, async (payload) => {
          try {
            const slug = normalizeSlug(String(payload?.slug || ""));
            if (!slug) {
              toolbarApi.send(TOOLBAR_EVENTS.healthResult, {
                checks: [],
                error: "Missing slug",
                slug: null,
                summary: {
                  failures: 1,
                  ok: false,
                  warnings: 0,
                },
                timestamp: new Date().toISOString(),
              });
              return;
            }

            const resource = await requestResource(iiifServer, slug);
            if (!resource) {
              toolbarApi.send(TOOLBAR_EVENTS.healthResult, {
                checks: [],
                error: `Resource not found for slug: ${slug}`,
                slug,
                summary: {
                  failures: 1,
                  ok: false,
                  warnings: 0,
                },
                timestamp: new Date().toISOString(),
              });
              return;
            }

            const report = await buildHealthReport(iiifServer, resource);
            toolbarApi.send(TOOLBAR_EVENTS.healthResult, report);
          } catch (error) {
            sendError("health-check", error);
          }
        });

        if (typeof toolbarApi.onAppInitialized === "function") {
          toolbarApi.onAppInitialized(TOOLBAR_APP_ID, () => {
            sendSnapshot().catch((error) => sendError("app-initialized", error));
          });
        }
        if (typeof toolbarApi.onAppToggled === "function") {
          toolbarApi.onAppToggled(TOOLBAR_APP_ID, ({ state }) => {
            if (!state) {
              return;
            }
            sendSnapshot().catch((error) => sendError("app-toggled", error));
          });
        }
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
