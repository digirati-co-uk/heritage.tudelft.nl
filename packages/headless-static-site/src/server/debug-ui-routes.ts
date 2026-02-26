import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { cwd } from "node:process";
import { upgrade } from "@iiif/parser/upgrader";
import type { Hono } from "hono";
import type { FileHandler } from "../util/file-handler.ts";
import type { IIIFRC } from "../util/get-config.ts";
import { resolveFromSlug } from "../util/resolve-from-slug.ts";
import type { SlugConfig } from "../util/slug-engine.ts";

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function mimeTypeFor(path: string) {
  const extension = extname(path).toLowerCase();
  return MIME_TYPES[extension] || "application/octet-stream";
}

function asLabel(value: any): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.find(Boolean) || null;
  }
  for (const key of Object.keys(value)) {
    const candidate = value[key];
    if (Array.isArray(candidate) && candidate.length) {
      return candidate.find(Boolean) || null;
    }
  }
  return null;
}

function asThumbnailUrl(thumbnail: any): string | null {
  if (!thumbnail) {
    return null;
  }
  if (typeof thumbnail === "string") {
    return thumbnail;
  }
  if (Array.isArray(thumbnail) && thumbnail.length) {
    const first = thumbnail[0];
    if (typeof first === "string") {
      return first;
    }
    return first?.id || first?.["@id"] || null;
  }
  return thumbnail.id || thumbnail["@id"] || null;
}

function trimSlashes(value: string) {
  return value.replace(/^\/+/, "").replace(/\/+$/, "");
}

function normalizeMountPrefix(value: string | undefined) {
  if (!value) {
    return "";
  }
  const normalized = `/${trimSlashes(value)}`;
  return normalized === "/" ? "" : normalized;
}

function getDebugMountBase(pathname: string, mountPrefix?: string) {
  const prefix = normalizeMountPrefix(mountPrefix);
  const marker = "/_debug";
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex === -1) {
    return `${prefix}${marker}`;
  }
  return `${prefix}${pathname.slice(0, markerIndex + marker.length)}`;
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function toAbsoluteUrl(base: string, path: string) {
  return new URL(trimSlashes(path), ensureTrailingSlash(base)).toString();
}

function findUpwardNodeModulesDebugUiDir(startDir: string) {
  let currentDir = resolve(startDir);
  while (true) {
    const candidate = join(currentDir, "node_modules", "iiif-hss", "build", "dev-ui");
    if (existsSync(candidate)) {
      return candidate;
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}

function resolveSafePath(root: string, requestedPath: string) {
  const absoluteRoot = resolve(root);
  const absoluteTarget = resolve(absoluteRoot, requestedPath);
  if (!absoluteTarget.startsWith(absoluteRoot)) {
    return null;
  }
  return absoluteTarget;
}

function withNull<T>(callback: () => T): T | null {
  try {
    return callback();
  } catch (error) {
    return null;
  }
}

function toAbsoluteDiskPath(source: any) {
  if (!source || source.type !== "disk") {
    return null;
  }
  const rawPath = source.filePath || source.path;
  if (!rawPath || typeof rawPath !== "string") {
    return null;
  }
  if (rawPath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(rawPath)) {
    return rawPath;
  }
  return join(cwd(), rawPath);
}

function tryResolveSlug(
  slug: string,
  type: "Manifest" | "Collection",
  slugsConfig: Record<string, SlugConfig> | undefined
) {
  if (!slugsConfig) {
    return null;
  }
  return resolveFromSlug(slug, type, slugsConfig, true) || resolveFromSlug(`/${slug}`, type, slugsConfig, true);
}

export function findDebugUiDir(currentWorkingDirectory: string, resolveModule?: (specifier: string) => string) {
  const localBuild = join(currentWorkingDirectory, "build", "dev-ui");
  if (existsSync(localBuild)) {
    return localBuild;
  }

  const localTraceBuild = join(currentWorkingDirectory, "hss-trace", "dist");
  if (existsSync(localTraceBuild)) {
    return localTraceBuild;
  }

  const packageNodeModulesBuild = findUpwardNodeModulesDebugUiDir(currentWorkingDirectory);
  if (packageNodeModulesBuild) {
    return packageNodeModulesBuild;
  }

  if (resolveModule) {
    const resolvableEntrypoints = [
      "iiif-hss/package.json",
      "iiif-hss/astro",
      "iiif-hss/vite-plugin",
      "iiif-hss/library",
      "iiif-hss",
    ];
    for (const specifier of resolvableEntrypoints) {
      const modulePath = withNull(() => resolveModule(specifier));
      if (!modulePath) {
        continue;
      }
      const packageRoot = withNull(() => dirname(dirname(modulePath)));
      if (!packageRoot) {
        continue;
      }
      const packagedBuild = join(packageRoot, "build", "dev-ui");
      if (existsSync(packagedBuild)) {
        return packagedBuild;
      }
    }
  }

  return null;
}

interface RegisterDebugUiRoutesOptions {
  app: Hono;
  fileHandler: FileHandler;
  getActivePaths: () => { buildDir: string; cacheDir: string };
  getConfig: () => Promise<IIIFRC> | IIIFRC;
  getTraceJson?: () => unknown;
  getDebugUiDir: () => string | null;
  manifestEditorUrl?: string;
  getBuildStatus?: () => {
    status: "idle" | "building" | "ready" | "error";
    startedAt: string | null;
    completedAt: string | null;
    lastError: string | null;
    buildCount: number;
  };
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
  defaultRun?: string[];
  rebuild?: () => Promise<void>;
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function uniqueTrimmedStrings(values: unknown, fieldName: string) {
  if (!Array.isArray(values)) {
    throw new Error(`"${fieldName}" must be an array of strings`);
  }
  const out = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") {
      throw new Error(`"${fieldName}" must be an array of strings`);
    }
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    out.add(trimmed);
  }
  return [...out];
}

function normalizeTopicTypes(value: unknown, fieldName: string) {
  if (!isPlainObject(value)) {
    throw new Error(`"${fieldName}" must be an object mapping topic types to labels`);
  }

  const topicTypes: Record<string, string[]> = {};
  for (const [key, labels] of Object.entries(value)) {
    const topicType = key.trim();
    if (!topicType) {
      continue;
    }
    const labelList =
      typeof labels === "string"
        ? uniqueTrimmedStrings([labels], `${fieldName}.${topicType}`)
        : uniqueTrimmedStrings(labels, `${fieldName}.${topicType}`);
    if (labelList.length) {
      topicTypes[topicType] = labelList;
    }
  }
  return topicTypes;
}

async function loadExistingExtractTopicsConfig(configPath: string) {
  if (!existsSync(configPath)) {
    return null;
  }
  const raw = await readFile(configPath, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    if (isPlainObject(parsed)) {
      return parsed;
    }
    throw new Error("extract-topics.json must contain a JSON object");
  } catch (error) {
    throw new Error(`Invalid JSON in ${configPath}: ${(error as Error).message}`);
  }
}

function getExtractTopicsWarnings(config: IIIFRC, metadataAnalysisExists: boolean, defaultRun: string[] = []) {
  const warnings: string[] = [];
  const effectiveRun = Array.isArray(config.run) ? config.run : defaultRun;
  const hasConfiguredExtractTopics = Boolean(config.config?.["extract-topics"]);
  if (!effectiveRun.includes("extract-topics") && !hasConfiguredExtractTopics) {
    warnings.push("`extract-topics` is not enabled in `run`; generated topic collections will not be emitted yet.");
  }
  if (!metadataAnalysisExists) {
    warnings.push("metadata-analysis.json was not found in the current build output.");
  }
  return warnings;
}

export function registerDebugUiRoutes({
  app,
  fileHandler,
  getActivePaths,
  getConfig,
  getTraceJson,
  getDebugUiDir,
  manifestEditorUrl = "https://manifest-editor.digirati.services",
  getBuildStatus,
  onboarding,
  defaultRun = [],
  rebuild,
}: RegisterDebugUiRoutesOptions) {
  app.get("/_debug/api/status", async (ctx) => {
    return ctx.json({
      build: getBuildStatus
        ? getBuildStatus()
        : {
            status: "idle",
            startedAt: null,
            completedAt: null,
            lastError: null,
            buildCount: 0,
          },
      onboarding: onboarding || {
        enabled: false,
        configMode: "unknown",
        contentFolder: null,
        shorthand: null,
      },
    });
  });

  app.get("/_debug/api/site", async (ctx) => {
    const { buildDir } = getActivePaths();
    const config = await getConfig();
    const siteMapPath = join(cwd(), buildDir, "meta", "sitemap.json");
    const topCollectionPath = join(cwd(), buildDir, "collection.json");
    const manifestsCollectionPath = join(cwd(), buildDir, "manifests", "collection.json");
    const topicsCollectionPath = join(cwd(), buildDir, "topics", "collection.json");

    const siteMap = (await fileHandler.loadJson(siteMapPath, true)) as Record<string, any>;
    const topCollection = (await fileHandler.loadJson(topCollectionPath, true)) as Record<string, any>;
    const manifestsCollection = (await fileHandler.loadJson(manifestsCollectionPath, true)) as Record<string, any>;
    const topicsCollection = (await fileHandler.loadJson(topicsCollectionPath, true)) as Record<string, any>;
    const baseUrl = config.server?.url || new URL(ctx.req.url).origin;
    const topicItems = Array.isArray(topicsCollection?.items) ? topicsCollection.items : [];

    const featuredItems = (topCollection.items?.length ? topCollection.items : manifestsCollection.items || []).map(
      (item: any) => {
        const slug = trimSlashes(item?.["hss:slug"] || "");
        return {
          id: item?.id || null,
          slug: slug || null,
          label: asLabel(item?.label),
          thumbnail: asThumbnailUrl(item?.thumbnail),
          type: slug ? siteMap[slug]?.type || item?.type || null : item?.type || null,
          source: slug ? siteMap[slug]?.source || null : null,
          diskPath: slug ? toAbsoluteDiskPath(siteMap[slug]?.source) : null,
        };
      }
    );

    return ctx.json({
      buildDir,
      baseUrl,
      build: getBuildStatus
        ? getBuildStatus()
        : {
            status: "idle",
            startedAt: null,
            completedAt: null,
            lastError: null,
            buildCount: 0,
          },
      onboarding: onboarding || {
        enabled: false,
        configMode: "unknown",
        contentFolder: null,
        shorthand: null,
      },
      hasDebugUiAssets: Boolean(getDebugUiDir()),
      topCollection,
      manifestsCollection,
      topics: {
        available: topicItems.length > 0,
        totalItems: topicItems.length,
        slug: topicItems.length > 0 ? "topics" : null,
        label: asLabel(topicsCollection?.label) || "Topics",
      },
      featuredItems,
      resources: Object.entries(siteMap || {}).map(([slug, value]) => ({
        slug,
        type: (value as any)?.type || null,
        label: (value as any)?.label || null,
        source: (value as any)?.source || null,
        diskPath: toAbsoluteDiskPath((value as any)?.source),
      })),
    });
  });

  app.get("/_debug/api/resource/*", async (ctx) => {
    const { buildDir, cacheDir } = getActivePaths();
    const config = await getConfig();
    const siteMapPath = join(cwd(), buildDir, "meta", "sitemap.json");
    const editablePath = join(cwd(), buildDir, "meta", "editable.json");
    const siteMap = (await fileHandler.loadJson(siteMapPath, true)) as Record<string, any>;
    const editable = (await fileHandler.loadJson(editablePath, true)) as Record<string, string>;
    const slugsConfig = config.slugs as Record<string, SlugConfig> | undefined;

    const rawSlug = decodeURIComponent((ctx.req.path.split("/_debug/api/resource/")[1] || "").split("?")[0] || "");
    const slug = trimSlashes(rawSlug).replace(/\/(manifest|collection)\.json$/i, "");
    if (!slug) {
      return ctx.json({ error: "Missing slug" }, 400);
    }

    const manifestPath = join(cwd(), buildDir, slug, "manifest.json");
    const collectionPath = join(cwd(), buildDir, slug, "collection.json");
    const hasManifest = fileHandler.exists(manifestPath);
    const hasCollection = fileHandler.exists(collectionPath);

    const source = siteMap[slug]?.source || null;
    let type: "Manifest" | "Collection" | null = siteMap[slug]?.type || null;
    if (!type) {
      if (hasManifest) {
        type = "Manifest";
      }
      if (!type && hasCollection) {
        type = "Collection";
      }
    }

    const reverseManifest = tryResolveSlug(slug, "Manifest", slugsConfig);
    const reverseCollection = tryResolveSlug(slug, "Collection", slugsConfig);
    if (!type && reverseManifest) {
      type = "Manifest";
    }
    if (!type && reverseCollection) {
      type = "Collection";
    }

    const filePath =
      type === "Manifest"
        ? hasManifest
          ? manifestPath
          : null
        : type === "Collection"
          ? hasCollection
            ? collectionPath
            : null
          : null;
    let resource = filePath ? await fileHandler.loadJson(filePath, true) : null;
    if (!resource && source?.type === "remote" && source.url) {
      try {
        const remoteResponse = await fetch(source.url);
        if (remoteResponse.ok) {
          resource = await remoteResponse.json();
        }
      } catch (error) {
        // Keep resource as null; UI can still use links for remote JSON.
      }
    }

    resource = resource ? upgrade(resource) : null;

    if (!type && resource?.type && (resource.type === "Manifest" || resource.type === "Collection")) {
      type = resource.type;
    }
    const baseUrl = config.server?.url || new URL(ctx.req.url).origin;

    const localJsonPath = filePath ? `/${slug}/${type === "Manifest" ? "manifest.json" : "collection.json"}` : null;
    const localJsonUrl = localJsonPath ? toAbsoluteUrl(baseUrl, localJsonPath) : null;
    const remoteJsonUrl =
      source?.type === "remote"
        ? source.url
        : type === "Manifest"
          ? reverseManifest?.match || null
          : type === "Collection"
            ? reverseCollection?.match || null
            : null;
    const primaryJsonUrl = localJsonUrl || remoteJsonUrl;

    const meta = await fileHandler.loadJson(join(cwd(), cacheDir, slug, "meta.json"), true);
    const indices = await fileHandler.loadJson(join(cwd(), cacheDir, slug, "indices.json"), true);

    const manifestEditorLink =
      type === "Manifest" && primaryJsonUrl
        ? `${manifestEditorUrl}/editor/external?manifest=${encodeURIComponent(primaryJsonUrl)}`
        : null;
    const theseusLink = primaryJsonUrl
      ? `https://theseusviewer.org?iiif-content=${encodeURIComponent(primaryJsonUrl)}&ref=hss-debug`
      : null;

    return ctx.json({
      slug,
      type,
      source,
      diskPath: toAbsoluteDiskPath(source),
      isEditable: Boolean(editable[slug]),
      editablePath: editable[slug] || null,
      resource,
      meta,
      indices,
      reverse: {
        manifest: reverseManifest,
        collection: reverseCollection,
      },
      links: {
        json: primaryJsonUrl,
        localJson: localJsonUrl,
        remoteJson: remoteJsonUrl,
        manifestEditor: manifestEditorLink,
        theseus: theseusLink,
      },
    });
  });

  app.get("/_debug/api/trace", async (ctx) => {
    return ctx.json(getTraceJson ? getTraceJson() : {});
  });

  app.get("/_debug/api/metadata-analysis", async (ctx) => {
    const { buildDir } = getActivePaths();
    const config = await getConfig();
    const metadataAnalysisPath = join(cwd(), buildDir, "meta", "metadata-analysis.json");
    const metadataAnalysisExists = existsSync(metadataAnalysisPath);
    const analysis = metadataAnalysisExists ? await fileHandler.loadJson(metadataAnalysisPath, true) : null;
    const outputPath = join(cwd(), "iiif-config", "config", "extract-topics.json");

    return ctx.json({
      analysis,
      extractTopicsConfig: config.config?.["extract-topics"] || null,
      outputPath,
      canWrite: true,
      warnings: getExtractTopicsWarnings(config, metadataAnalysisExists, defaultRun),
    });
  });

  app.post("/_debug/api/metadata-analysis/create-collection", async (ctx) => {
    const config = await getConfig();
    const { buildDir } = getActivePaths();
    const metadataAnalysisPath = join(cwd(), buildDir, "meta", "metadata-analysis.json");
    const metadataAnalysisExists = existsSync(metadataAnalysisPath);
    let payload: any = null;
    try {
      payload = await ctx.req.json();
    } catch (error) {
      return ctx.json({ error: "Invalid JSON body" }, 400);
    }

    let topicTypes: Record<string, string[]>;
    try {
      topicTypes = normalizeTopicTypes(payload?.topicTypes, "topicTypes");
    } catch (error) {
      return ctx.json({ error: (error as Error).message }, 400);
    }
    if (Object.keys(topicTypes).length === 0) {
      return ctx.json({ error: '"topicTypes" must include at least one topic type with labels' }, 400);
    }

    const mode: "merge" | "replace" = payload?.mode === "replace" ? "replace" : "merge";
    const nextExtractTopicsConfig: Record<string, any> = {
      topicTypes,
    };

    if (typeof payload?.translate !== "undefined") {
      if (typeof payload.translate !== "boolean") {
        return ctx.json({ error: '"translate" must be a boolean' }, 400);
      }
      nextExtractTopicsConfig.translate = payload.translate;
    }
    if (typeof payload?.language !== "undefined") {
      if (typeof payload.language !== "string" || !payload.language.trim()) {
        return ctx.json({ error: '"language" must be a non-empty string' }, 400);
      }
      nextExtractTopicsConfig.language = payload.language.trim();
    }
    if (typeof payload?.commaSeparated !== "undefined") {
      try {
        nextExtractTopicsConfig.commaSeparated = uniqueTrimmedStrings(payload.commaSeparated, "commaSeparated");
      } catch (error) {
        return ctx.json({ error: (error as Error).message }, 400);
      }
    }

    const outputPath = join(cwd(), "iiif-config", "config", "extract-topics.json");
    let existingConfig = null;
    try {
      existingConfig = await loadExistingExtractTopicsConfig(outputPath);
    } catch (error) {
      return ctx.json({ error: (error as Error).message }, 400);
    }
    const inMemoryConfig = isPlainObject(config.config?.["extract-topics"]) ? config.config?.["extract-topics"] : {};
    const baseConfig = isPlainObject(existingConfig) ? existingConfig : inMemoryConfig;

    let mergedTopicTypes = topicTypes;
    if (mode === "merge") {
      try {
        mergedTopicTypes = {
          ...normalizeTopicTypes(baseConfig.topicTypes || {}, "topicTypes"),
          ...topicTypes,
        };
      } catch (error) {
        return ctx.json({ error: `Invalid existing topicTypes: ${(error as Error).message}` }, 400);
      }
    }

    const finalConfig = {
      ...baseConfig,
      ...nextExtractTopicsConfig,
      topicTypes: mergedTopicTypes,
    };

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(finalConfig, null, 2)}\n`, "utf-8");

    config.config = config.config || {};
    config.config["extract-topics"] = finalConfig;

    let rebuildStatus: {
      triggered: boolean;
      mode: "full";
      ok: boolean;
      error: string | null;
    } = {
      triggered: Boolean(rebuild),
      mode: "full",
      ok: true,
      error: null,
    };

    if (rebuild) {
      try {
        await rebuild();
      } catch (error) {
        // Writing the config is still successful even if rebuild fails.
        rebuildStatus = {
          ...rebuildStatus,
          ok: false,
          error: (error as Error)?.message || String(error),
        };
      }
    }

    return ctx.json({
      saved: true,
      path: outputPath,
      extractTopicsConfig: finalConfig,
      rebuild: rebuildStatus,
      warnings: getExtractTopicsWarnings(config, metadataAnalysisExists, defaultRun),
    });
  });

  app.get("/_debug", async (ctx) => {
    return ctx.redirect(`${getDebugMountBase(ctx.req.path, ctx.req.header("x-hss-base-path"))}/`, 302);
  });

  app.get("/_debug/assets/*", async (ctx) => {
    const debugUiDir = getDebugUiDir();
    if (!debugUiDir) {
      return ctx.text("Debug UI is not built yet.", 404);
    }

    const assetPath = ctx.req.path.split("/_debug/assets/")[1] || "";
    const absoluteAssetPath = resolveSafePath(join(debugUiDir, "assets"), assetPath);
    if (!absoluteAssetPath || !existsSync(absoluteAssetPath)) {
      return ctx.notFound();
    }

    const body = await readFile(absoluteAssetPath);
    return ctx.body(body, 200, {
      "Content-Type": mimeTypeFor(absoluteAssetPath),
      "Cache-Control": "public, max-age=31536000, immutable",
    });
  });

  app.get("/_debug/*", async (ctx) => {
    const debugUiDir = getDebugUiDir();
    if (!debugUiDir) {
      return ctx.html(`
        <!doctype html>
        <html>
          <head><meta charset="utf-8" /><title>Debug UI missing</title></head>
          <body style="font-family: sans-serif; padding: 2rem;">
            <h1>Debug UI is not built</h1>
            <p>Run <code>pnpm run build:dev-ui</code> to build the React debug app.</p>
          </body>
        </html>
      `);
    }

    const indexPath = join(debugUiDir, "index.html");
    if (!existsSync(indexPath)) {
      return ctx.text(`Missing debug UI index at ${indexPath}`, 404);
    }

    const debugMountBase = getDebugMountBase(ctx.req.path, ctx.req.header("x-hss-base-path"));
    const indexHtml = await readFile(indexPath, "utf-8");
    const rewrittenHtml = indexHtml.replaceAll("./assets/", `${debugMountBase}/assets/`);
    return ctx.html(rewrittenHtml);
  });
}
