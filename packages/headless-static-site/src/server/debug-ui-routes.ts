import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { cwd } from "node:process";
import { upgrade } from "@iiif/parser/upgrader";
import type { Hono } from "hono";
import micromatch from "micromatch";
import slug from "slug";
import { parse as parseYaml, stringify } from "yaml";
import type { FolderCollectionsConfig } from "../extract/extract-folder-collections.ts";
import type { FileHandler } from "../util/file-handler.ts";
import type { ConfigMode, IIIFRC } from "../util/get-config.ts";
import type { GenericStore } from "../util/get-config.ts";
import { makeGetSlugHelper } from "../util/make-slug-helper.ts";
import { readAllFiles } from "../util/read-all-files.ts";
import { readFilteredFiles } from "../util/read-filtered-files.ts";
import { resolveFromSlug } from "../util/resolve-from-slug.ts";
import { rewritePath } from "../util/rewrite-path.ts";
import type { SlugConfig } from "../util/slug-engine.ts";
import { compileReverseSlugConfig, compileSlugConfig } from "../util/slug-engine.ts";
import { assertStoreId, maybeRunRebuild, resolveIiifConfigWorkspace, writeJsonObject } from "./config-workspace.ts";

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
  getConfigMode?: () => Promise<ConfigMode | "unknown"> | ConfigMode | "unknown";
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

function normalizeLabelValue(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

async function getCurrentConfigMode(getConfigMode?: () => Promise<ConfigMode | "unknown"> | ConfigMode | "unknown") {
  if (!getConfigMode) {
    return "unknown";
  }
  return await getConfigMode();
}

function normalizeFolderCollectionsConfig(input: unknown): FolderCollectionsConfig {
  const value = (input || {}) as FolderCollectionsConfig;
  const minDepth = typeof value.minDepth === "number" ? Math.max(0, Math.floor(value.minDepth)) : 1;
  const labelStrategy = value.labelStrategy || "folderName";
  const ignorePaths = Array.isArray(value.ignorePaths)
    ? value.ignorePaths.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [];
  const customMap = isPlainObject(value.customMap) ? value.customMap : {};

  return {
    enabled: value.enabled !== false,
    minDepth,
    ignorePaths,
    labelStrategy,
    customMap,
  };
}

function normalizeCollectionSurfaceValue(input: unknown) {
  if (!isPlainObject(input)) {
    return {};
  }
  return input as Record<string, any>;
}

function normalizeTopicThumbnailConfig(input: unknown) {
  const value = isPlainObject(input) ? input : {};
  const strategy = ["first", "mostRecent", "highestRes", "random"].includes(String(value.selectionStrategy))
    ? String(value.selectionStrategy)
    : "first";
  const fallback = typeof value.fallback === "string" && value.fallback.trim() ? value.fallback.trim() : null;
  return {
    selectionStrategy: strategy,
    fallback,
  };
}

async function getCachedResources(cacheDir: string, handler: FileHandler) {
  const cacheRoot = join(cwd(), cacheDir);
  if (!existsSync(cacheRoot)) {
    return [];
  }
  const resourceFiles = Array.from(readAllFiles(cacheRoot)).filter((file) => file.endsWith("/resource.json"));
  const resources = [];
  for (const file of resourceFiles) {
    const loaded = await handler.loadJson(file, true);
    if (loaded?.slug && loaded?.type) {
      resources.push(loaded);
    }
  }
  return resources as Array<any>;
}

function toSlugCompileMap(slugs: Record<string, SlugConfig>) {
  return Object.fromEntries(
    Object.entries(slugs || {}).map(([key, value]) => [key, { info: value, compile: compileSlugConfig(value) }])
  );
}

export function registerDebugUiRoutes({
  app,
  fileHandler,
  getActivePaths,
  getConfig,
  getConfigMode,
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

  app.get("/_debug/api/config/stores", async (ctx) => {
    const config = await getConfig();
    const mode = await getCurrentConfigMode(getConfigMode);
    const workspace = resolveIiifConfigWorkspace(mode);
    return ctx.json({
      mode,
      writable: workspace.writable,
      reason: workspace.reason || null,
      stores: config.stores || {},
      outputDir: workspace.storesDir,
    });
  });

  app.post("/_debug/api/config/stores/preview", async (ctx) => {
    let payload: any;
    try {
      payload = await ctx.req.json();
    } catch (error) {
      return ctx.json({ error: "Invalid JSON body" }, 400);
    }
    const store = payload?.store;
    if (!isPlainObject(store)) {
      return ctx.json({ error: '"store" must be an object' }, 400);
    }
    if (store.type !== "iiif-json" && store.type !== "iiif-remote") {
      return ctx.json({ error: '"store.type" must be "iiif-json" or "iiif-remote"' }, 400);
    }

    if (store.type === "iiif-json") {
      if (!store.path || typeof store.path !== "string") {
        return ctx.json({ error: '"store.path" is required for iiif-json stores' }, 400);
      }
      const pathExists = existsSync(store.path);
      const files = pathExists ? readFilteredFiles(store as GenericStore) : [];
      const rewrite = rewritePath(store);
      return ctx.json({
        type: "iiif-json",
        pathExists,
        matchedCount: files.length,
        sampleFiles: files.slice(0, 20),
        sampleSlugs: files.slice(0, 20).map((file) => rewrite(file)),
      });
    }

    const urls = [
      ...(store.url ? [store.url] : []),
      ...(Array.isArray(store.urls) ? store.urls : []).filter((value) => typeof value === "string"),
    ].map((value) => String(value).trim());
    if (!urls.length) {
      return ctx.json({ error: "iiif-remote store needs `url` or `urls`." }, 400);
    }

    const checks = [];
    for (const url of urls.slice(0, 5)) {
      try {
        const response = await fetch(url);
        const json = response.ok ? await response.json() : null;
        checks.push({
          url,
          ok: response.ok,
          status: response.status,
          type: json?.type || json?.["@type"] || null,
          id: json?.id || json?.["@id"] || null,
          items: Array.isArray(json?.items) ? json.items.length : null,
        });
      } catch (error) {
        checks.push({
          url,
          ok: false,
          status: null,
          error: (error as Error)?.message || String(error),
        });
      }
    }

    return ctx.json({
      type: "iiif-remote",
      urls,
      checks,
      overrides: store.overrides || null,
      overridesExists: typeof store.overrides === "string" ? existsSync(store.overrides) : null,
      saveManifests: Boolean(store.saveManifests),
    });
  });

  app.put("/_debug/api/config/stores/:storeId", async (ctx) => {
    const mode = await getCurrentConfigMode(getConfigMode);
    const workspace = resolveIiifConfigWorkspace(mode);
    if (!workspace.writable) {
      return ctx.json({ error: workspace.reason || "Config workspace is read-only." }, 409);
    }

    const storeId = ctx.req.param("storeId");
    try {
      assertStoreId(storeId);
    } catch (error) {
      return ctx.json({ error: (error as Error).message }, 400);
    }

    let payload: any;
    try {
      payload = await ctx.req.json();
    } catch (error) {
      return ctx.json({ error: "Invalid JSON body" }, 400);
    }
    const store = payload?.store;
    if (!isPlainObject(store)) {
      return ctx.json({ error: '"store" must be an object' }, 400);
    }
    if (store.type !== "iiif-json" && store.type !== "iiif-remote") {
      return ctx.json({ error: '"store.type" must be "iiif-json" or "iiif-remote"' }, 400);
    }
    if (store.type === "iiif-json" && (!store.path || typeof store.path !== "string")) {
      return ctx.json({ error: '"store.path" is required for iiif-json stores' }, 400);
    }
    if (
      store.type === "iiif-remote" &&
      !store.url &&
      !(Array.isArray(store.urls) && store.urls.some((value: unknown) => typeof value === "string"))
    ) {
      return ctx.json({ error: "iiif-remote store requires url or urls" }, 400);
    }

    const outputPath = join(workspace.storesDir, `${storeId}.json`);
    await writeJsonObject(outputPath, store);

    const config = await getConfig();
    config.stores = config.stores || {};
    config.stores[storeId] = store as any;
    const rebuildStatus = await maybeRunRebuild(rebuild);

    return ctx.json({
      saved: true,
      path: outputPath,
      storeId,
      store,
      rebuild: rebuildStatus,
    });
  });

  app.delete("/_debug/api/config/stores/:storeId", async (ctx) => {
    const mode = await getCurrentConfigMode(getConfigMode);
    const workspace = resolveIiifConfigWorkspace(mode);
    if (!workspace.writable) {
      return ctx.json({ error: workspace.reason || "Config workspace is read-only." }, 409);
    }

    const storeId = ctx.req.param("storeId");
    try {
      assertStoreId(storeId);
    } catch (error) {
      return ctx.json({ error: (error as Error).message }, 400);
    }

    const outputPath = join(workspace.storesDir, `${storeId}.json`);
    await rm(outputPath, { force: true });

    const config = await getConfig();
    if (config.stores?.[storeId]) {
      delete config.stores[storeId];
    }
    const rebuildStatus = await maybeRunRebuild(rebuild);

    return ctx.json({
      saved: true,
      deleted: true,
      path: outputPath,
      storeId,
      rebuild: rebuildStatus,
    });
  });

  app.get("/_debug/api/config/slugs", async (ctx) => {
    const config = await getConfig();
    const mode = await getCurrentConfigMode(getConfigMode);
    const workspace = resolveIiifConfigWorkspace(mode);
    return ctx.json({
      mode,
      writable: workspace.writable,
      reason: workspace.reason || null,
      slugs: config.slugs || {},
      outputPath: join(workspace.configRoot, "slugs.json"),
    });
  });

  app.post("/_debug/api/config/slugs/compile-preview", async (ctx) => {
    const config = await getConfig();
    let payload: any;
    try {
      payload = await ctx.req.json();
    } catch (error) {
      payload = {};
    }
    const slugsConfig = isPlainObject(payload?.slugs) ? payload.slugs : config.slugs || {};
    const sharedSamples = Array.isArray(payload?.samples)
      ? payload.samples.filter((value: unknown) => typeof value === "string")
      : [];

    const preview: Record<string, any> = {};
    for (const [key, value] of Object.entries(slugsConfig)) {
      try {
        const compiled = compileSlugConfig(value as SlugConfig);
        const reverse = compileReverseSlugConfig(value as SlugConfig);
        const examples = [...((value as SlugConfig).examples || []), ...sharedSamples].filter(Boolean);
        const tests = examples.map((example) => {
          const [matchedSlug] = compiled(example);
          if (!matchedSlug) {
            return {
              input: example,
              matched: false,
            };
          }
          const prefixed = `${(value as SlugConfig).type === "Manifest" ? "manifests" : "collections"}/${matchedSlug}`;
          const [roundTrip] = reverse(prefixed);
          return {
            input: example,
            matched: true,
            slug: matchedSlug,
            reverseTarget: prefixed,
            reverseMatch: roundTrip || null,
          };
        });
        preview[key] = {
          ok: true,
          tests,
        };
      } catch (error) {
        preview[key] = {
          ok: false,
          error: (error as Error)?.message || String(error),
        };
      }
    }

    return ctx.json({ preview });
  });

  app.post("/_debug/api/config/slugs/collision-preview", async (ctx) => {
    const config = await getConfig();
    const { cacheDir } = getActivePaths();
    let payload: any;
    try {
      payload = await ctx.req.json();
    } catch (error) {
      payload = {};
    }
    const slugsConfig = isPlainObject(payload?.slugs) ? payload.slugs : config.slugs || {};
    const storesConfig = isPlainObject(payload?.stores) ? payload.stores : config.stores || {};
    let compiledSlugs: Record<string, any> = {};
    try {
      compiledSlugs = toSlugCompileMap(slugsConfig as Record<string, SlugConfig>);
    } catch (error) {
      return ctx.json({ error: (error as Error)?.message || String(error) }, 400);
    }
    const resources = await getCachedResources(cacheDir, fileHandler);
    const bySlug: Record<string, any[]> = {};

    for (const resource of resources) {
      if (!resource?.id || !resource?.type || !resource?.storeId) {
        continue;
      }
      const storeConfig = storesConfig[resource.storeId];
      if (!storeConfig) {
        continue;
      }
      const helper = makeGetSlugHelper(storeConfig as GenericStore, compiledSlugs as any);
      const [computedSlug, slugSource] = helper({ id: resource.id, type: resource.type });
      if (!computedSlug) {
        continue;
      }
      bySlug[computedSlug] = bySlug[computedSlug] || [];
      bySlug[computedSlug].push({
        id: resource.id,
        type: resource.type,
        storeId: resource.storeId,
        currentSlug: resource.slug,
        candidateSlug: computedSlug,
        slugSource,
      });
    }

    const collisions = Object.entries(bySlug)
      .filter(([, entries]) => entries.length > 1)
      .map(([candidateSlug, entries]) => ({
        candidateSlug,
        entries,
      }));

    return ctx.json({
      resourceCount: resources.length,
      collisions,
      warnings: resources.length === 0 ? ["No cached resources found. Run a build before collision analysis."] : [],
    });
  });

  app.post("/_debug/api/config/slugs/save", async (ctx) => {
    const mode = await getCurrentConfigMode(getConfigMode);
    const workspace = resolveIiifConfigWorkspace(mode);
    if (!workspace.writable) {
      return ctx.json({ error: workspace.reason || "Config workspace is read-only." }, 409);
    }

    let payload: any;
    try {
      payload = await ctx.req.json();
    } catch (error) {
      return ctx.json({ error: "Invalid JSON body" }, 400);
    }

    if (!isPlainObject(payload?.slugs)) {
      return ctx.json({ error: '"slugs" must be an object' }, 400);
    }

    const outputPath = join(workspace.configRoot, "slugs.json");
    await writeJsonObject(outputPath, payload.slugs);

    const config = await getConfig();
    config.slugs = payload.slugs;
    const rebuildStatus = await maybeRunRebuild(rebuild);

    return ctx.json({
      saved: true,
      path: outputPath,
      slugs: payload.slugs,
      rebuild: rebuildStatus,
    });
  });

  app.get("/_debug/api/config/collections", async (ctx) => {
    const config = await getConfig();
    const mode = await getCurrentConfigMode(getConfigMode);
    const workspace = resolveIiifConfigWorkspace(mode);
    return ctx.json({
      mode,
      writable: workspace.writable,
      reason: workspace.reason || null,
      collections: config.collections || {},
      outputPath: join(workspace.configRoot, "collections.json"),
    });
  });

  app.post("/_debug/api/config/collections/save", async (ctx) => {
    const mode = await getCurrentConfigMode(getConfigMode);
    const workspace = resolveIiifConfigWorkspace(mode);
    if (!workspace.writable) {
      return ctx.json({ error: workspace.reason || "Config workspace is read-only." }, 409);
    }

    let payload: any;
    try {
      payload = await ctx.req.json();
    } catch (error) {
      return ctx.json({ error: "Invalid JSON body" }, 400);
    }
    if (!isPlainObject(payload?.collections)) {
      return ctx.json({ error: '"collections" must be an object' }, 400);
    }

    const normalizedCollections = {
      index: normalizeCollectionSurfaceValue(payload.collections.index),
      manifests: normalizeCollectionSurfaceValue(payload.collections.manifests),
      collections: normalizeCollectionSurfaceValue(payload.collections.collections),
      topics: normalizeCollectionSurfaceValue(payload.collections.topics),
    };
    const outputPath = join(workspace.configRoot, "collections.json");
    await writeJsonObject(outputPath, normalizedCollections);

    const config = await getConfig();
    config.collections = normalizedCollections as any;
    const rebuildStatus = await maybeRunRebuild(rebuild);

    return ctx.json({
      saved: true,
      path: outputPath,
      collections: normalizedCollections,
      rebuild: rebuildStatus,
    });
  });

  app.get("/_debug/api/config/folder-collections", async (ctx) => {
    const config = await getConfig();
    const mode = await getCurrentConfigMode(getConfigMode);
    const workspace = resolveIiifConfigWorkspace(mode);
    const normalized = normalizeFolderCollectionsConfig(config.config?.["folder-collections"]);
    return ctx.json({
      mode,
      writable: workspace.writable,
      reason: workspace.reason || null,
      config: normalized,
      outputPath: join(workspace.configDir, "folder-collections.json"),
    });
  });

  app.post("/_debug/api/config/folder-collections/preview", async (ctx) => {
    const config = await getConfig();
    const { cacheDir } = getActivePaths();
    let payload: any;
    try {
      payload = await ctx.req.json();
    } catch (error) {
      payload = {};
    }

    const previewConfig = normalizeFolderCollectionsConfig(payload?.config || config.config?.["folder-collections"]);
    const resources = await getCachedResources(cacheDir, fileHandler);
    const included: Record<string, { count: number; label: string }> = {};
    const excluded: Array<{ slug: string; excludeReason: string }> = [];

    for (const resource of resources) {
      const relativePath = resource?.source?.relativePath ? String(resource.source.relativePath).trim() : "";
      if (!relativePath) {
        continue;
      }
      const depth = relativePath.split("/").filter(Boolean).length;
      if (!previewConfig.enabled) {
        excluded.push({ slug: relativePath, excludeReason: "disabled" });
        continue;
      }
      if (depth < (previewConfig.minDepth || 0)) {
        excluded.push({ slug: relativePath, excludeReason: "minDepth" });
        continue;
      }
      if (previewConfig.ignorePaths?.length && micromatch.isMatch(relativePath, previewConfig.ignorePaths)) {
        excluded.push({ slug: relativePath, excludeReason: "ignorePaths" });
        continue;
      }

      let label = relativePath.split("/").filter(Boolean).pop() || relativePath;
      if (previewConfig.labelStrategy === "customMap") {
        const custom = previewConfig.customMap?.[relativePath];
        if (typeof custom === "string" && custom.trim()) {
          label = custom;
        }
      }
      if (previewConfig.labelStrategy === "folderName" || !previewConfig.labelStrategy) {
        label = label
          .split(/[-_\s]+/g)
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");
      }
      if (previewConfig.labelStrategy === "metadata" && resource.source.type === "disk") {
        const ymlPath = join(resource.source.path, relativePath, "_collection.yml");
        const yamlPath = join(resource.source.path, relativePath, "_collection.yaml");
        const pathToUse = existsSync(ymlPath) ? ymlPath : existsSync(yamlPath) ? yamlPath : null;
        if (pathToUse) {
          const loaded = parseYaml(await readFile(pathToUse, "utf-8"));
          if (loaded?.label) {
            label = typeof loaded.label === "string" ? loaded.label : label;
          }
        }
      }

      included[relativePath] = included[relativePath] || { count: 0, label };
      included[relativePath].count += 1;
    }

    return ctx.json({
      config: previewConfig,
      included: Object.entries(included)
        .map(([slug, value]) => ({ slug, count: value.count, label: value.label, excluded: false }))
        .sort((a, b) => b.count - a.count),
      excluded,
    });
  });

  app.post("/_debug/api/config/folder-collections/save", async (ctx) => {
    const mode = await getCurrentConfigMode(getConfigMode);
    const workspace = resolveIiifConfigWorkspace(mode);
    if (!workspace.writable) {
      return ctx.json({ error: workspace.reason || "Config workspace is read-only." }, 409);
    }
    let payload: any;
    try {
      payload = await ctx.req.json();
    } catch (error) {
      return ctx.json({ error: "Invalid JSON body" }, 400);
    }
    const normalized = normalizeFolderCollectionsConfig(payload?.config);
    const outputPath = join(workspace.configDir, "folder-collections.json");
    await writeJsonObject(outputPath, normalized as any);

    const config = await getConfig();
    config.config = config.config || {};
    config.config["folder-collections"] = normalized as any;
    const rebuildStatus = await maybeRunRebuild(rebuild);
    return ctx.json({
      saved: true,
      path: outputPath,
      config: normalized,
      rebuild: rebuildStatus,
    });
  });

  app.get("/_debug/api/topics/thumbnails", async (ctx) => {
    const config = await getConfig();
    const { buildDir, cacheDir } = getActivePaths();
    const topicsRoot = join(cwd(), "content", "topics");
    const metaIndicesPath = join(cwd(), buildDir, "meta", "indices.json");
    const topicIndex = (await fileHandler.loadJson(metaIndicesPath, true)) as Record<string, Record<string, string[]>>;
    const scriptConfig = normalizeTopicThumbnailConfig(config.config?.["enrich-topic-thumbnails"]);
    const entries: Array<{
      key: string;
      topicType: string;
      topic: string;
      topicSlug: string;
      count: number;
      currentThumbnail: string | null;
      candidates: string[];
    }> = [];

    for (const [topicType, values] of Object.entries(topicIndex || {})) {
      for (const [topic, slugs] of Object.entries(values || {})) {
        const topicSlug = slug(topic);
        const topicMetaPath = join(topicsRoot, topicType, `${topicSlug}.yaml`);
        const existingMeta = existsSync(topicMetaPath) ? parseYaml(await readFile(topicMetaPath, "utf-8")) : {};
        const currentThumbnail =
          typeof existingMeta?.thumbnail === "string" && existingMeta.thumbnail.trim() ? existingMeta.thumbnail : null;
        const candidates = new Set<string>();
        for (const itemSlug of slugs || []) {
          const metaPath = join(cwd(), cacheDir, itemSlug, "meta.json");
          if (!existsSync(metaPath)) {
            continue;
          }
          const meta = await fileHandler.loadJson(metaPath, true);
          const thumbnail =
            (typeof meta?.thumbnail?.id === "string" && meta.thumbnail.id) ||
            (typeof meta?.thumbnail === "string" && meta.thumbnail) ||
            null;
          if (thumbnail) {
            candidates.add(thumbnail);
          }
        }
        entries.push({
          key: `${topicType}:${topic}`,
          topicType,
          topic,
          topicSlug,
          count: slugs.length,
          currentThumbnail,
          candidates: [...candidates].slice(0, 20),
        });
      }
    }

    return ctx.json({
      config: scriptConfig,
      entries: entries.sort((a, b) => b.count - a.count),
      outputPath: join(cwd(), "iiif-config", "config", "enrich-topic-thumbnails.json"),
    });
  });

  app.post("/_debug/api/topics/thumbnails/preview-selection", async (ctx) => {
    const config = await getConfig();
    const { buildDir, cacheDir } = getActivePaths();
    let payload: any;
    try {
      payload = await ctx.req.json();
    } catch (error) {
      payload = {};
    }
    const scriptConfig = normalizeTopicThumbnailConfig(payload?.config || config.config?.["enrich-topic-thumbnails"]);
    const metaIndicesPath = join(cwd(), buildDir, "meta", "indices.json");
    const topicIndex = (await fileHandler.loadJson(metaIndicesPath, true)) as Record<string, Record<string, string[]>>;
    const preview: Array<{ topicType: string; topic: string; selectedThumbnail: string | null; candidates: string[] }> =
      [];

    for (const [topicType, values] of Object.entries(topicIndex || {})) {
      for (const [topic, slugs] of Object.entries(values || {})) {
        const candidates: string[] = [];
        for (const itemSlug of slugs || []) {
          const metaPath = join(cwd(), cacheDir, itemSlug, "meta.json");
          if (!existsSync(metaPath)) {
            continue;
          }
          const meta = await fileHandler.loadJson(metaPath, true);
          const thumbnail =
            (typeof meta?.thumbnail?.id === "string" && meta.thumbnail.id) ||
            (typeof meta?.thumbnail === "string" && meta.thumbnail) ||
            null;
          if (thumbnail && !candidates.includes(thumbnail)) {
            candidates.push(thumbnail);
          }
        }
        let selected: string | null = null;
        if (scriptConfig.selectionStrategy === "random" && candidates.length) {
          selected = candidates[Math.floor(Math.random() * candidates.length)];
        } else {
          selected = candidates[0] || null;
        }
        if (!selected) {
          selected = scriptConfig.fallback || null;
        }
        preview.push({
          topicType,
          topic,
          selectedThumbnail: selected,
          candidates: candidates.slice(0, 20),
        });
      }
    }

    return ctx.json({
      config: scriptConfig,
      preview,
    });
  });

  app.post("/_debug/api/topics/thumbnails/save-config", async (ctx) => {
    const mode = await getCurrentConfigMode(getConfigMode);
    const workspace = resolveIiifConfigWorkspace(mode);
    if (!workspace.writable) {
      return ctx.json({ error: workspace.reason || "Config workspace is read-only." }, 409);
    }
    let payload: any;
    try {
      payload = await ctx.req.json();
    } catch (error) {
      return ctx.json({ error: "Invalid JSON body" }, 400);
    }
    const normalized = normalizeTopicThumbnailConfig(payload?.config);
    const outputPath = join(workspace.configDir, "enrich-topic-thumbnails.json");
    await writeJsonObject(outputPath, normalized as any);

    const config = await getConfig();
    config.config = config.config || {};
    config.config["enrich-topic-thumbnails"] = normalized;
    const rebuildStatus = await maybeRunRebuild(rebuild);

    return ctx.json({
      saved: true,
      path: outputPath,
      config: normalized,
      rebuild: rebuildStatus,
    });
  });

  app.post("/_debug/api/topics/thumbnails/save-override", async (ctx) => {
    let payload: any;
    try {
      payload = await ctx.req.json();
    } catch (error) {
      return ctx.json({ error: "Invalid JSON body" }, 400);
    }
    const topicType = String(payload?.topicType || "").trim();
    const topic = String(payload?.topic || "").trim();
    const thumbnail = String(payload?.thumbnail || "").trim();
    if (!topicType || !topic) {
      return ctx.json({ error: '"topicType" and "topic" are required' }, 400);
    }
    if (!thumbnail) {
      return ctx.json({ error: '"thumbnail" is required' }, 400);
    }
    const topicSlug = slug(topic) || normalizeLabelValue(topic);
    const topicPath = join(cwd(), "content", "topics", topicType, `${topicSlug}.yaml`);
    const existing = existsSync(topicPath) ? parseYaml(await readFile(topicPath, "utf-8")) : {};
    const next = {
      id: topicSlug,
      label: topic,
      slug: `topics/${topicType}/${topicSlug}`,
      ...existing,
      thumbnail,
    };
    await mkdir(dirname(topicPath), { recursive: true });
    await writeFile(topicPath, stringify(next), "utf-8");
    const rebuildStatus = await maybeRunRebuild(rebuild);
    return ctx.json({
      saved: true,
      path: topicPath,
      topicType,
      topic,
      thumbnail,
      rebuild: rebuildStatus,
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
