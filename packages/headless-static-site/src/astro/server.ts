import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { cwd } from "node:process";
import { defaultBuiltIns } from "../commands/build.ts";
import { resolveFromSlug } from "../util/resolve-from-slug.ts";
import {
  type AstroParamsLike,
  type IIIFResourceType,
  type IIIFSitemapEntry,
  asAstroParam,
  extractItemSlugs,
  isHttpUrl,
  normalizeSlug,
  slugFromParams,
} from "./shared.ts";

type JsonObject = Record<string, any>;

export interface AstroIiifServerOptions {
  root?: string;
  buildDir?: string;
  baseUrl?: string;
  preferDevBuild?: boolean;
  fetchFn?: typeof fetch;
}

export interface AstroIiifStaticPathOptions {
  param?: string;
  split?: boolean;
}

export interface AstroIiifResolvedResource {
  slug: string;
  type: IIIFResourceType | null;
  source: IIIFSitemapEntry["source"] | null;
  resource: JsonObject | null;
  meta: JsonObject | null;
  indices: JsonObject | null;
  links: {
    json: string | null;
    localJson: string | null;
    remoteJson: string | null;
  };
}

function asObject(value: unknown) {
  return value && typeof value === "object" ? (value as JsonObject) : null;
}

function asNormalizedBasePath(baseUrl: string | undefined) {
  const raw = baseUrl || "/";
  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, "");
  }
  const withLeadingSlash = `/${raw}`.replace(/\/+/g, "/");
  return withLeadingSlash.replace(/\/+$/, "") || "/";
}

function joinBaseAndPath(base: string, suffix: string) {
  if (/^https?:\/\//i.test(base)) {
    return new URL(suffix.replace(/^\/+/, ""), `${base}/`).toString();
  }

  const normalizedSuffix = suffix.replace(/^\/+/, "");
  if (base === "/") {
    return `/${normalizedSuffix}`;
  }
  return `${base}/${normalizedSuffix}`.replace(/\/+/g, "/");
}

async function safeReadJson(filePath: string) {
  try {
    const loaded = await readFile(filePath, "utf-8");
    return JSON.parse(loaded);
  } catch (error) {
    return null;
  }
}

export function createIiifAstroServer(options: AstroIiifServerOptions = {}) {
  const root = options.root ? resolve(options.root) : cwd();
  const baseUrl = asNormalizedBasePath(options.baseUrl);
  const preferDevBuild = options.preferDevBuild ?? true;
  const fetchFn = options.fetchFn || fetch;
  let resolvedBuildDir: string | null = null;

  const cache = {
    sitemap: null as Record<string, IIIFSitemapEntry> | null,
    slugs: null as Record<string, any> | null,
  };

  function resolveBuildDir() {
    if (resolvedBuildDir) {
      return resolvedBuildDir;
    }

    if (options.buildDir) {
      resolvedBuildDir = resolve(root, options.buildDir);
      return resolvedBuildDir;
    }

    const devBuildDir = resolve(root, defaultBuiltIns.devBuild);
    if (preferDevBuild && existsSync(devBuildDir)) {
      resolvedBuildDir = devBuildDir;
      return resolvedBuildDir;
    }

    resolvedBuildDir = resolve(root, defaultBuiltIns.defaultBuildDir);
    return resolvedBuildDir;
  }

  async function getSitemap() {
    if (cache.sitemap) {
      return cache.sitemap;
    }
    const loaded = await safeReadJson(join(resolveBuildDir(), "meta", "sitemap.json"));
    cache.sitemap = (asObject(loaded) || {}) as Record<string, IIIFSitemapEntry>;
    return cache.sitemap;
  }

  async function getSlugsConfig() {
    if (cache.slugs) {
      return cache.slugs;
    }
    const loaded = await safeReadJson(join(resolveBuildDir(), "config", "slugs.json"));
    cache.slugs = (asObject(loaded) || {}) as Record<string, any>;
    return cache.slugs;
  }

  function resourcePaths(slug: string) {
    const buildDir = resolveBuildDir();
    return {
      manifest: join(buildDir, slug, "manifest.json"),
      collection: join(buildDir, slug, "collection.json"),
      meta: join(buildDir, slug, "meta.json"),
      indices: join(buildDir, slug, "indices.json"),
    };
  }

  async function resolveRemote(slug: string, type: IIIFResourceType | null, source: IIIFSitemapEntry["source"] | null) {
    if (source?.type === "remote" && source.url) {
      return source.url;
    }
    if (!type) {
      return null;
    }

    const slugs = await getSlugsConfig();
    const resolved = resolveFromSlug(slug, type, slugs);
    return resolved?.match || null;
  }

  async function tryLoadRemoteJson(url: string | null) {
    if (!url) {
      return null;
    }
    try {
      const response = await fetchFn(url);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  async function loadResource(slugOrUrl: string, forcedType?: IIIFResourceType | null): Promise<AstroIiifResolvedResource> {
    if (isHttpUrl(slugOrUrl)) {
      const remote = await tryLoadRemoteJson(slugOrUrl);
      const type = remote?.type === "Manifest" || remote?.type === "Collection" ? remote.type : forcedType || null;
      return {
        slug: normalizeSlug(slugOrUrl),
        type: type || null,
        source: { type: "remote", url: slugOrUrl },
        resource: asObject(remote),
        meta: null,
        indices: null,
        links: {
          json: slugOrUrl,
          localJson: null,
          remoteJson: slugOrUrl,
        },
      };
    }

    const slug = normalizeSlug(slugOrUrl);
    const siteMap = await getSitemap();
    const entry = siteMap[slug] || null;
    const paths = resourcePaths(slug);
    const hasManifest = existsSync(paths.manifest);
    const hasCollection = existsSync(paths.collection);

    let type: IIIFResourceType | null = forcedType || (entry?.type as IIIFResourceType) || null;
    if (!type && hasManifest) {
      type = "Manifest";
    }
    if (!type && hasCollection) {
      type = "Collection";
    }

    const localFile =
      type === "Manifest"
        ? hasManifest
          ? paths.manifest
          : null
        : type === "Collection"
          ? hasCollection
            ? paths.collection
            : null
          : hasManifest
            ? paths.manifest
            : hasCollection
              ? paths.collection
              : null;

    let resource = asObject(localFile ? await safeReadJson(localFile) : null);
    if (!type && resource?.type && (resource.type === "Manifest" || resource.type === "Collection")) {
      type = resource.type as IIIFResourceType;
    }

    const remoteJson = await resolveRemote(slug, type, entry?.source || null);
    if (!resource) {
      resource = asObject(await tryLoadRemoteJson(remoteJson));
      if (!type && resource?.type && (resource.type === "Manifest" || resource.type === "Collection")) {
        type = resource.type as IIIFResourceType;
      }
    }

    const localJson =
      type && localFile
        ? joinBaseAndPath(baseUrl, `${slug}/${type === "Manifest" ? "manifest.json" : "collection.json"}`)
        : null;

    return {
      slug,
      type,
      source: entry?.source || null,
      resource,
      meta: asObject(await safeReadJson(paths.meta)),
      indices: asObject(await safeReadJson(paths.indices)),
      links: {
        json: localJson || remoteJson,
        localJson,
        remoteJson,
      },
    };
  }

  async function loadManifest(slugOrUrl: string) {
    return loadResource(slugOrUrl, "Manifest");
  }

  async function loadCollection(slugOrUrl: string) {
    return loadResource(slugOrUrl, "Collection");
  }

  async function loadTopCollection() {
    return asObject(await safeReadJson(join(resolveBuildDir(), "collection.json")));
  }

  async function loadManifestsCollection() {
    return asObject(await safeReadJson(join(resolveBuildDir(), "manifests", "collection.json")));
  }

  async function loadCollectionsCollection() {
    return asObject(await safeReadJson(join(resolveBuildDir(), "collections", "collection.json")));
  }

  async function listSlugs(type?: IIIFResourceType) {
    const siteMap = await getSitemap();
    const entries = Object.entries(siteMap);
    const filtered = type ? entries.filter(([, entry]) => entry?.type === type) : entries;
    return filtered.map(([slug]) => slug);
  }

  async function getStaticPaths(type: IIIFResourceType, options: AstroIiifStaticPathOptions = {}) {
    const param = options.param || "slug";
    const slugs = await listSlugs(type);
    return slugs.map((slug) => ({
      params: {
        [param]: asAstroParam(slug, options.split || false),
      },
    }));
  }

  function getStaticPathsFromCollection(collection: JsonObject, options: AstroIiifStaticPathOptions = {}) {
    const param = options.param || "slug";
    const slugs = extractItemSlugs(collection);
    return slugs.map((slug) => ({
      params: {
        [param]: asAstroParam(slug, options.split || false),
      },
    }));
  }

  async function loadResourceFromParams(params: AstroParamsLike, param = "slug") {
    return loadResource(slugFromParams(params, param));
  }

  async function loadManifestFromParams(params: AstroParamsLike, param = "slug") {
    return loadManifest(slugFromParams(params, param));
  }

  async function loadCollectionFromParams(params: AstroParamsLike, param = "slug") {
    return loadCollection(slugFromParams(params, param));
  }

  return {
    resolveBuildDir,
    clearCache: () => {
      cache.sitemap = null;
      cache.slugs = null;
    },
    slugFromParams,
    getSitemap,
    getSlugsConfig,
    listSlugs,
    getManifestStaticPaths: (options?: AstroIiifStaticPathOptions) => getStaticPaths("Manifest", options),
    getCollectionStaticPaths: (options?: AstroIiifStaticPathOptions) => getStaticPaths("Collection", options),
    getStaticPathsFromCollection,
    loadTopCollection,
    loadManifestsCollection,
    loadCollectionsCollection,
    loadResource,
    loadManifest,
    loadCollection,
    loadResourceFromParams,
    loadManifestFromParams,
    loadCollectionFromParams,
  };
}

export default createIiifAstroServer;
