import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { cwd } from "node:process";
import { defaultBuiltIns } from "../commands/build.ts";
import { resolveFromSlug } from "../util/resolve-from-slug.ts";
import {
  type AstroIiifRoutes,
  type AstroParamsLike,
  type IIIFResourceType,
  type IIIFSitemapEntry,
  type StaticPathStripPrefix,
  asAstroParam,
  extractItemSlugs,
  getResourceSlugCandidates,
  isHttpUrl,
  normalizeSlug,
  normalizeSlugForStaticPath,
  resolveAstroIiifRoutes,
  runtimeHintFromMeta,
  slugFromParams,
} from "./shared.ts";

type JsonObject = Record<string, any>;

export interface AstroIiifServerOptions {
  root?: string;
  buildDir?: string;
  baseUrl?: string;
  routes?: AstroIiifRoutes;
  preferDevBuild?: boolean;
  fetchFn?: typeof fetch;
}

export interface AstroIiifStaticPathOptions {
  param?: string;
  split?: boolean;
  type?: IIIFResourceType;
  stripPrefix?: StaticPathStripPrefix;
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

function emptyCollection(id: string, label: string) {
  return {
    id,
    type: "Collection",
    label: { en: [label] },
    items: [],
  } as JsonObject;
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
  const routes = resolveAstroIiifRoutes(options.routes);
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

  async function loadResource(
    slugOrUrl: string,
    forcedType?: IIIFResourceType | null
  ): Promise<AstroIiifResolvedResource> {
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

    const requestedSlug = normalizeSlug(slugOrUrl);
    const slugCandidates = getResourceSlugCandidates(requestedSlug, forcedType || null, routes);
    const localCandidates = Array.from(new Set([requestedSlug, ...slugCandidates])).filter(Boolean);

    let slug = localCandidates[0] || requestedSlug;
    let type: IIIFResourceType | null = forcedType || null;
    let source: IIIFSitemapEntry["source"] | null = null;
    let resource: JsonObject | null = null;
    let localJson: string | null = null;
    let remoteJson: string | null = null;

    const cachedMeta = new Map<
      string,
      {
        meta: JsonObject | null;
        runtime: ReturnType<typeof runtimeHintFromMeta>;
      }
    >();
    const getMetaForCandidate = async (candidate: string) => {
      if (cachedMeta.has(candidate)) {
        return cachedMeta.get(candidate)!;
      }
      const candidatePaths = resourcePaths(candidate);
      const meta = asObject(await safeReadJson(candidatePaths.meta));
      const runtime = runtimeHintFromMeta(meta);
      const value = { meta, runtime };
      cachedMeta.set(candidate, value);
      return value;
    };

    const runtimeByCandidate = new Map<string, ReturnType<typeof runtimeHintFromMeta>>();
    let preferredRemoteCandidate: string | null = null;

    for (const candidate of localCandidates) {
      const { runtime } = await getMetaForCandidate(candidate);
      runtimeByCandidate.set(candidate, runtime);
      if (!runtime) {
        continue;
      }

      if (!type && runtime.type) {
        type = runtime.type;
      }
      if (!source && runtime.source) {
        source = runtime.source;
      }

      const typeMatches = !forcedType || !runtime.type || runtime.type === forcedType;
      if (!typeMatches) {
        continue;
      }

      if (!remoteJson && runtime.source?.type === "remote" && runtime.source.url) {
        remoteJson = runtime.source.url;
      }

      if (
        !preferredRemoteCandidate &&
        runtime.source?.type === "remote" &&
        runtime.source.url &&
        runtime.saveToDisk === false
      ) {
        preferredRemoteCandidate = candidate;
        remoteJson = runtime.source.url;
        slug = candidate;
      }
    }

    if (preferredRemoteCandidate && remoteJson) {
      resource = asObject(await tryLoadRemoteJson(remoteJson));
      if (!type && resource?.type && (resource.type === "Manifest" || resource.type === "Collection")) {
        type = resource.type as IIIFResourceType;
      }
    }

    const localResourceOrder =
      type === "Manifest" ? ["manifest"] : type === "Collection" ? ["collection"] : ["manifest", "collection"];

    for (const kind of localResourceOrder) {
      if (resource) {
        break;
      }
      for (const candidate of localCandidates) {
        const runtime = runtimeByCandidate.get(candidate);
        if (runtime?.source?.type === "remote" && runtime.saveToDisk === false) {
          continue;
        }
        const candidatePaths = resourcePaths(candidate);
        const localFile = kind === "manifest" ? candidatePaths.manifest : candidatePaths.collection;
        if (!existsSync(localFile)) {
          continue;
        }
        const localResource = asObject(await safeReadJson(localFile));
        if (!localResource) {
          continue;
        }
        resource = localResource;
        slug = candidate;
        type = kind === "manifest" ? "Manifest" : "Collection";
        localJson = joinBaseAndPath(baseUrl, `${slug}/${kind}.json`);
        break;
      }
    }

    if (!remoteJson) {
      remoteJson = await resolveRemote(slug, type, source);
    }

    if (!resource) {
      resource = asObject(await tryLoadRemoteJson(remoteJson));
      if (!type && resource?.type && (resource.type === "Manifest" || resource.type === "Collection")) {
        type = resource.type as IIIFResourceType;
      }
    }

    const { meta } = slug ? await getMetaForCandidate(slug) : { meta: null };
    const paths = resourcePaths(slug);

    return {
      slug,
      type,
      source,
      resource,
      meta,
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

  async function loadStoreCollectionsCollection() {
    return asObject(await safeReadJson(join(resolveBuildDir(), "collections", "stores", "collection.json")));
  }

  async function getAllManifests() {
    const manifests = await loadManifestsCollection();
    if (manifests) {
      return manifests;
    }

    const top = await loadTopCollection();
    if (top) {
      return top;
    }

    return emptyCollection(joinBaseAndPath(baseUrl, "manifests/collection.json"), "Manifests");
  }

  async function getAllCollections() {
    const collections = await loadCollectionsCollection();
    if (collections) {
      return collections;
    }

    const top = await loadTopCollection();
    if (top) {
      return top;
    }

    return emptyCollection(joinBaseAndPath(baseUrl, "collections/collection.json"), "Collections");
  }

  async function getAllStoreCollections() {
    const stores = await loadStoreCollectionsCollection();
    if (stores) {
      return stores;
    }

    return emptyCollection(joinBaseAndPath(baseUrl, "collections/stores/collection.json"), "Stores");
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
    const seen = new Set<string>();
    const staticPaths = [];

    for (const slug of slugs) {
      const normalized = normalizeSlugForStaticPath(slug, {
        type,
        stripPrefix: options.stripPrefix,
        routes,
      });
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      staticPaths.push({
        params: {
          [param]: asAstroParam(normalized, options.split || false),
        },
      });
    }

    return staticPaths;
  }

  function getStaticPathsFromCollection(collection: JsonObject, options: AstroIiifStaticPathOptions = {}) {
    const param = options.param || "slug";
    const slugs = extractItemSlugs(collection, {
      type: options.type,
      stripPrefix: options.stripPrefix,
      routes,
    });
    return slugs.map((slug) => ({
      params: {
        [param]: asAstroParam(slug, options.split || false),
      },
    }));
  }

  function getManifestStaticPathsFromCollection(collection: JsonObject, options: AstroIiifStaticPathOptions = {}) {
    return getStaticPathsFromCollection(collection, {
      ...options,
      type: "Manifest",
      stripPrefix: options.stripPrefix ?? true,
    });
  }

  function getCollectionStaticPathsFromCollection(collection: JsonObject, options: AstroIiifStaticPathOptions = {}) {
    return getStaticPathsFromCollection(collection, {
      ...options,
      type: "Collection",
      stripPrefix: options.stripPrefix ?? true,
    });
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
    getManifestStaticPaths: (options?: AstroIiifStaticPathOptions) =>
      getStaticPaths("Manifest", {
        ...(options || {}),
        stripPrefix: options?.stripPrefix ?? true,
      }),
    getCollectionStaticPaths: (options?: AstroIiifStaticPathOptions) =>
      getStaticPaths("Collection", {
        ...(options || {}),
        stripPrefix: options?.stripPrefix ?? true,
      }),
    getStaticPathsFromCollection,
    getManifestStaticPathsFromCollection,
    getCollectionStaticPathsFromCollection,
    getAllManifests,
    getAllCollections,
    getAllStoreCollections,
    loadTopCollection,
    loadManifestsCollection,
    loadCollectionsCollection,
    loadStoreCollectionsCollection,
    loadResource,
    loadManifest,
    loadCollection,
    loadResourceFromParams,
    loadManifestFromParams,
    loadCollectionFromParams,
  };
}

export default createIiifAstroServer;
