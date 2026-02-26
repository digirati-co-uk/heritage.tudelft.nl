import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { cwd } from "node:process";
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
}

export function registerDebugUiRoutes({
  app,
  fileHandler,
  getActivePaths,
  getConfig,
  getTraceJson,
  getDebugUiDir,
  manifestEditorUrl = "https://manifest-editor.digirati.services",
}: RegisterDebugUiRoutesOptions) {
  app.get("/_debug/api/site", async (ctx) => {
    const { buildDir } = getActivePaths();
    const config = await getConfig();
    const siteMapPath = join(cwd(), buildDir, "meta", "sitemap.json");
    const topCollectionPath = join(cwd(), buildDir, "collection.json");
    const manifestsCollectionPath = join(cwd(), buildDir, "manifests", "collection.json");

    const siteMap = (await fileHandler.loadJson(siteMapPath, true)) as Record<string, any>;
    const topCollection = (await fileHandler.loadJson(topCollectionPath, true)) as Record<string, any>;
    const manifestsCollection = (await fileHandler.loadJson(manifestsCollectionPath, true)) as Record<string, any>;
    const baseUrl = config.server?.url || new URL(ctx.req.url).origin;

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
      hasDebugUiAssets: Boolean(getDebugUiDir()),
      topCollection,
      manifestsCollection,
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
