import fs from "node:fs";
import { existsSync } from "node:fs";
import { watch, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { cwd } from "node:process";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { timeout } from "hono/timeout";
import mitt from "mitt";
import { z } from "zod";
import { type BuildOptions, build, defaultBuiltIns } from "./commands/build";
import { findDebugUiDir, registerDebugUiRoutes } from "./server/debug-ui-routes.ts";
import { FileHandler } from "./util/file-handler";
import type { IIIFRC, ResolvedConfigSource } from "./util/get-config";
import { Tracer } from "./util/tracer";

const require = createRequire(import.meta.url);

interface IIIFServerOptions {
  customManifestEditor?: string;
  configSource?: Omit<ResolvedConfigSource, "config">;
  onboarding?: {
    enabled?: boolean;
    configMode?: string;
    contentFolder?: string | null;
    shorthand?: {
      enabled: boolean;
      urls: string[];
      saveManifests: boolean;
      overrides: string;
    } | null;
    hints?: {
      addContent?: string;
      astro?: string;
      vite?: string;
    };
  };
}

function redirectToDebugPath(basePathHeader?: string) {
  const normalizedBase = (basePathHeader || "").replace(/^\/+/, "").replace(/\/+$/, "");
  return normalizedBase.length > 0 ? `/${normalizedBase}/_debug/` : "/_debug/";
}

export async function createServer(config: IIIFRC, serverOptions: IIIFServerOptions = {}) {
  const app = new Hono();
  const meUrl = serverOptions.customManifestEditor || "https://manifest-editor.digirati.services";
  const configSource = serverOptions.configSource;

  app.use(async (c, next) => {
    if (c.req.method === "OPTIONS") {
      function set(key: string, value: string) {
        c.res.headers.set(key, value);
      }
      const didRequestPrivateNetwork = c.req.header("access-control-request-private-network");
      if (didRequestPrivateNetwork) {
        set("Access-Control-Allow-Private-Network", "true");
      }
    }
    await next();
  });

  app.use(
    cors({
      origin: "*",
      allowMethods: ["GET", "POST"],
      exposeHeaders: ["Content-Type", "X-IIIF-Post-Url", "Access-Control-Allow-Private-Network"],
      allowHeaders: ["Content-Type", "Access-Control-Request-Private-Network"],
    })
  );

  const emitter = mitt<{
    "file-change": { path: string };
    "file-refresh": { path: string };
    "full-rebuild": unknown;
  }>();

  // New Hono server.
  //
  // TODO Endpoints:
  // - POST /api/page-blocks
  // - POST /api/save-manifest
  //
  let ac = new AbortController();
  const pathCache = { allPaths: {} as Record<string, string> };

  let isWatching = false;
  const fileHandler = new FileHandler(fs, cwd());
  const tracer = new Tracer();
  const storeRequestCaches = {};
  const buildStatus = {
    status: "idle" as "idle" | "building" | "ready" | "error",
    startedAt: null as string | null,
    completedAt: null as string | null,
    lastError: null as string | null,
    buildCount: 0,
  };

  const state = {
    shouldRebuild: false,
  };

  function selectInitialPath(devPath: string, defaultPath: string) {
    return existsSync(join(cwd(), devPath)) ? devPath : defaultPath;
  }

  const activePaths = {
    buildDir: selectInitialPath(defaultBuiltIns.devBuild, defaultBuiltIns.defaultBuildDir),
    cacheDir: selectInitialPath(defaultBuiltIns.devCache, defaultBuiltIns.defaultCacheDir),
  };

  const cachedBuild = async (options: BuildOptions) => {
    buildStatus.status = "building";
    buildStatus.startedAt = new Date().toISOString();
    buildStatus.lastError = null;
    buildStatus.buildCount += 1;

    try {
      const result = await build(options, defaultBuiltIns, {
        storeRequestCaches,
        fileHandler,
        pathCache,
        tracer,
        customConfig: config,
        customConfigSource: configSource,
      });
      activePaths.buildDir = result.buildConfig.buildDir;
      activePaths.cacheDir = result.buildConfig.cacheDir;
      buildStatus.status = "ready";
      buildStatus.completedAt = new Date().toISOString();
      return result;
    } catch (error) {
      buildStatus.status = "error";
      buildStatus.completedAt = new Date().toISOString();
      buildStatus.lastError = (error as Error)?.message || String(error);
      throw error;
    }
  };

  app.get("/", async (ctx) => {
    return ctx.redirect(redirectToDebugPath(ctx.req.header("x-hss-base-path")));
  });

  app.get("/config", async (ctx) => {
    return ctx.json({
      isWatching: isWatching,
      pendingFiles: Array.from(fileHandler.openJsonChanged.keys()).filter(Boolean),
      ...config,
      run: config.run || defaultBuiltIns.defaultRun,
    });
  });

  app.get("/trace.json", async (ctx) => {
    return ctx.json(tracer.toJSON());
  });

  registerDebugUiRoutes({
    app,
    fileHandler,
    getActivePaths: () => ({ ...activePaths }),
    getConfig: () => config,
    getTraceJson: () => tracer.toJSON(),
    getDebugUiDir: () => findDebugUiDir(cwd(), require.resolve.bind(require)),
    manifestEditorUrl: meUrl,
    getBuildStatus: () => ({ ...buildStatus }),
    onboarding: serverOptions.onboarding,
  });

  app.get("/watch", async (ctx) => {
    if (isWatching) return ctx.json({ watching: true });

    const stores = Object.values(config.stores).filter((store) => {
      return store.type === "iiif-json";
    });
    const extraWatchPaths = configSource?.watchPaths || [];
    let watchCount = 0;

    for (const store of stores) {
      if (!existsSync(store.path)) {
        continue;
      }
      (async () => {
        const watcher = watch(store.path, {
          signal: ac.signal,
          recursive: true,
        });
        watchCount++;

        for await (const event of watcher) {
          if (event.filename) {
            const name = join(store.path, event.filename);
            const realPath = pathCache.allPaths[name];
            emitter.emit("file-change", { path: realPath });
            await cachedBuild({
              exact: realPath || undefined,
              emit: true,
              cache: true,
              dev: true,
            });
            emitter.emit("file-refresh", { path: realPath });
          }
        }
      })().catch((err) => {
        // ignore.
      });
    }

    for (const watchPath of extraWatchPaths) {
      if (!existsSync(watchPath.path)) {
        continue;
      }
      (async () => {
        const watcher = watch(watchPath.path, {
          signal: ac.signal,
          recursive: watchPath.recursive,
        });
        watchCount++;
        for await (const event of watcher) {
          await cachedBuild({
            emit: true,
            cache: true,
            dev: true,
          });
          emitter.emit("full-rebuild", {
            source: "config-watch",
            path: watchPath.path,
            filename: event.filename || null,
          });
        }
      })().catch((err) => {
        // ignore.
      });
    }

    console.log(`Watching ${watchCount} paths`);

    isWatching = true;

    return ctx.json({ watching: true });
  });

  app.get("/unwatch", async (ctx) => {
    ac.abort();
    ac = new AbortController();
    isWatching = false;
    return ctx.json({ watching: false });
  });

  app.get("/build/save", async (ctx) => {
    const total = Array.from(fileHandler.openJsonChanged.keys()).filter(Boolean).length;
    if (total) {
      await fileHandler.saveAll();
    }
    return ctx.json({ saved: true, total });
  });

  app.get(
    "/build",
    timeout(120_000),
    zValidator(
      "query",
      z.object({
        cache: z.string().optional(),
        generate: z.string().optional(),
        exact: z.string().optional(),
        save: z.string().optional(),
        emit: z.string().optional(),
        debug: z.string().optional(),
        enrich: z.string().optional(),
        extract: z.string().optional(),
      })
    ),
    async (ctx) => {
      const { buildConfig, emitted, enrichments, extractions, parsed, stores } = await cachedBuild({
        cache: ctx.req.query("cache") !== "false",
        generate: ctx.req.query("generate") !== "false",
        exact: ctx.req.query("exact"),
        emit: ctx.req.query("emit") !== "false",
        debug: ctx.req.query("debug") === "true",
        enrich: ctx.req.query("enrich") !== "false",
        extract: ctx.req.query("extract") !== "false",
        dev: true,
      });

      const { files, log, fileTypeCache, ...config } = buildConfig;

      const report = {
        emitted: {
          stats: emitted.stats,
          siteMap: emitted.siteMap,
        },
        enrichments,
        extractions,
        stores,
        parsed,
        config,
      };

      emitter.emit("full-rebuild", report);

      return ctx.json(report);
    }
  );

  app.post(
    "/build",
    timeout(120_000),
    zValidator(
      "json",
      z.object({
        cache: z.string().optional(),
        generate: z.string().optional(),
        exact: z.string().optional(),
        save: z.string().optional(),
        emit: z.string().optional(),
        debug: z.string().optional(),
        enrich: z.string().optional(),
        extract: z.string().optional(),
      })
    ),
    async (ctx) => {
      const body = await ctx.req.json();

      if (!body.exact) {
        state.shouldRebuild = false;
      }

      const { buildConfig, emitted, enrichments, extractions, parsed, stores } = await cachedBuild({
        ...body,
        dev: true,
      });

      const report = {
        emitted: {
          stats: emitted.stats,
          siteMap: emitted.siteMap,
        },
        enrichments,
        extractions,
        stores,
        parsed,
        buildConfig,
      };

      emitter.emit("full-rebuild", report);

      return ctx.json(report);
    }
  );

  app.get("/create", async (ctx) => {
    return ctx.html(`
      <form method="post">
        <label for="slug">Slug:</label>
        <input type="text" id="slug" name="slug" required>
        <label for="store">Store:</label>
        <select id="store" name="store">
          ${Object.entries(config.stores)
            .map(([key, value]) => `<option value="${key}">${key}</option>`)
            .join("")}
        </select>
        <button type="submit">Create</button>
      </form>
    `);
  });

  app.post(
    "/create",
    zValidator(
      "form",
      z.object({
        slug: z.string().min(1),
        store: z.string().optional(),
      })
    ),
    async (ctx, next) => {
      const defaultStore =
        Object.entries(config.stores).find(([key, value]) => value.type === "iiif-json")?.[0] || "default";
      const { store = defaultStore, slug: name } = ctx.req.valid("form");
      const isJson = await ctx.req.query("json");

      if (!name) {
        return ctx.text("Slug is required", 400);
      }

      const chosenStore = config.stores[store];
      if (!chosenStore) {
        return ctx.text(`Store ${store} not found`, 400);
      }
      if (chosenStore.type !== "iiif-json") {
        return ctx.text(`Store ${store} is not of type iiif-json`, 400);
      }

      // Check for existing?
      const existing = join(cwd(), chosenStore.path, `${name}.json`);
      if (existsSync(existing)) {
        return ctx.text(`Manifest ${name} already exists`, 400);
      }

      const manifest = {
        "@context": "http://iiif.io/api/presentation/3/context.json",
        id: `${join(chosenStore.destination || chosenStore.path, name)}`,
        type: "Manifest",
        label: {
          en: ["Blank Manifest"],
        },
        items: [],
      };

      await writeFile(existing, JSON.stringify(manifest, null, 2));

      const exactPath = join(chosenStore.destination || chosenStore.path, name);

      await cachedBuild({
        emit: true,
        cache: false,
      });

      const manifestId = `${exactPath}/manifest.json`;
      const manifestUrl = new URL(manifestId, config.server?.url || "http://localhost:7111/").toString();

      if (isJson) {
        return ctx.json({ manifestUrl, editUrl: `${meUrl}/editor/external?manifest=${manifestUrl}` });
      }

      return ctx.redirect(`${meUrl}/editor/external?manifest=${manifestUrl}`);
    }
  );

  app.get("/*", async (ctx, next) => {
    if (ctx.req.path.startsWith("/ws")) {
      await next();
      return;
    }
    let realPath = join(cwd(), activePaths.buildDir, ctx.req.path);
    if (realPath.endsWith("meta.json")) {
      realPath = join(cwd(), activePaths.cacheDir, ctx.req.path);
    }

    const headers: Record<string, string> = {
      //
    };

    const isManifest = ctx.req.path.endsWith("manifest.json");
    if (isManifest) {
      const manifestUrl = `${config.server?.url || "http://localhost:7111/"}${ctx.req.path}`;
      headers["X-IIIF-Post-Url"] = manifestUrl;
    }

    const isEdit = ctx.req.path.endsWith("/edit");
    if (isEdit) {
      const slug = ctx.req.path.replace("/edit", "").slice(1);
      const editable = join(cwd(), activePaths.buildDir, "meta/editable.json");
      const allEditable = await fileHandler.loadJson(editable, true);
      const realPath = allEditable[slug];
      if (!realPath) {
        return ctx.notFound();
      }

      const manifestId = ctx.req.path.replace("/edit", "/manifest.json");
      const manifestUrl = `${config.server?.url || "http://localhost:7111/"}${manifestId}`;

      return ctx.redirect(`${meUrl}/editor/external?manifest=${manifestUrl}`);
    }

    if (fileHandler.openJsonMap.has(fileHandler.resolve(realPath))) {
      const file = await fileHandler.loadJson(realPath);
      return ctx.json(file, { headers });
    }

    if (fileHandler.existsBinary(fileHandler.resolve(realPath))) {
      const file = await fileHandler.readFile(realPath);
      return ctx.body(file as any, { headers });
    }

    return ctx.notFound();
  });

  app.post("/*", async (ctx) => {
    const isManifest = ctx.req.path.endsWith("manifest.json");
    if (!isManifest) {
      return ctx.notFound();
    }

    // WIthout `/manifest.json`
    const slug = ctx.req.path.replace("/manifest.json", "").slice(1);
    const editable = join(cwd(), activePaths.buildDir, "meta/editable.json");
    const allEditable = await fileHandler.loadJson(editable, true);
    const realPath = allEditable[slug];
    if (!realPath) {
      return ctx.notFound();
    }

    const fullRealPath = join(cwd(), realPath);
    if (!fileHandler.exists(fullRealPath)) {
      return ctx.notFound();
    }

    const file = await ctx.req.json();
    await fileHandler.saveJson(fullRealPath, file, true);
    await cachedBuild({
      exact: slug,
      emit: true,
      cache: true,
    });
    emitter.emit("file-refresh", { path: realPath });

    return ctx.json({ saved: true });
  });

  return {
    request: app.request,
    fetch: app.fetch,
    port: 7111,
    _extra: {
      emitter,
      app,
      cachedBuild,
      getBuildStatus: () => ({ ...buildStatus }),
    },
  };
}
