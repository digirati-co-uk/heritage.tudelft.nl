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
  slugFromParams,
} from "./shared.ts";

type JsonObject = Record<string, any>;

export interface AstroIiifClientOptions {
  baseUrl?: string;
  routes?: AstroIiifRoutes;
  fetchFn?: typeof fetch;
  cache?: boolean;
}

export interface AstroIiifClientResolvedResource {
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

export interface AstroIiifStaticPathOptions {
  param?: string;
  split?: boolean;
  type?: IIIFResourceType;
  stripPrefix?: StaticPathStripPrefix;
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

function normalizeBaseUrl(input: string | undefined) {
  const raw = input || "";
  if (!raw) {
    return "";
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, "");
  }
  return `/${raw}`.replace(/\/+/g, "/").replace(/\/+$/, "");
}

function toUrl(baseUrl: string, path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.replace(/^\/+/, "");
  if (!baseUrl) {
    return `/${normalizedPath}`;
  }
  if (/^https?:\/\//i.test(baseUrl)) {
    return new URL(normalizedPath, `${baseUrl}/`).toString();
  }
  return `${baseUrl}/${normalizedPath}`.replace(/\/+/g, "/");
}

export function createIiifAstroClient(options: AstroIiifClientOptions = {}) {
  const configuredBaseUrl = normalizeBaseUrl(options.baseUrl || "/iiif");
  const routes = resolveAstroIiifRoutes(options.routes);
  const fetchFn = options.fetchFn || fetch;
  const useCache = options.cache ?? true;
  const cache = new Map<string, any>();
  let resolvedBaseUrl: string | null = configuredBaseUrl || null;

  function orderedBaseUrls() {
    const unique = new Set<string>();
    const ordered = [resolvedBaseUrl || "", configuredBaseUrl || "", "/iiif", ""];
    return ordered.filter((entry) => {
      if (unique.has(entry)) {
        return false;
      }
      unique.add(entry);
      return true;
    });
  }

  async function getJson(url: string) {
    if (useCache && cache.has(url)) {
      return cache.get(url);
    }

    const response = await fetchFn(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.status}`);
    }
    const json = await response.json();
    if (useCache) {
      cache.set(url, json);
    }
    return json;
  }

  async function tryGetJson(url: string) {
    try {
      return await getJson(url);
    } catch (error) {
      return null;
    }
  }

  async function getJsonWithBaseFallback(path: string) {
    let lastError: unknown = null;
    for (const candidateBase of orderedBaseUrls()) {
      const targetUrl = toUrl(candidateBase, path);
      try {
        const json = await getJson(targetUrl);
        if (!configuredBaseUrl) {
          resolvedBaseUrl = candidateBase;
        }
        return {
          baseUrl: candidateBase,
          json,
          url: targetUrl,
        };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error(`Unable to load ${path}`);
  }

  async function tryGetJsonWithBaseFallback(path: string) {
    try {
      return await getJsonWithBaseFallback(path);
    } catch (error) {
      return null;
    }
  }

  async function getSitemap() {
    const loaded = await tryGetJsonWithBaseFallback("/meta/sitemap.json");
    return (asObject(loaded?.json) || {}) as Record<string, IIIFSitemapEntry>;
  }

  async function loadTopCollection() {
    return asObject((await getJsonWithBaseFallback("/collection.json")).json);
  }

  async function loadManifestsCollection() {
    return asObject((await getJsonWithBaseFallback("/manifests/collection.json")).json);
  }

  async function loadCollectionsCollection() {
    return asObject((await getJsonWithBaseFallback("/collections/collection.json")).json);
  }

  async function loadStoreCollectionsCollection() {
    const loaded = await tryGetJsonWithBaseFallback("/collections/stores/collection.json");
    return asObject(loaded?.json);
  }

  async function getAllManifests() {
    try {
      const manifests = await loadManifestsCollection();
      if (manifests) {
        return manifests;
      }
    } catch (error) {
      // Missing manifests collection falls through to top/empty fallback.
    }

    try {
      const top = await loadTopCollection();
      if (top) {
        return top;
      }
    } catch (error) {
      // Missing top collection falls through to empty fallback.
    }

    const preferredBase = resolvedBaseUrl || configuredBaseUrl || "/iiif";
    return emptyCollection(toUrl(preferredBase, "/manifests/collection.json"), "Manifests");
  }

  async function getAllCollections() {
    try {
      const collections = await loadCollectionsCollection();
      if (collections) {
        return collections;
      }
    } catch (error) {
      // Missing collections collection falls through to top/empty fallback.
    }

    try {
      const top = await loadTopCollection();
      if (top) {
        return top;
      }
    } catch (error) {
      // Missing top collection falls through to empty fallback.
    }

    const preferredBase = resolvedBaseUrl || configuredBaseUrl || "/iiif";
    return emptyCollection(toUrl(preferredBase, "/collections/collection.json"), "Collections");
  }

  async function getAllStoreCollections() {
    const stores = await loadStoreCollectionsCollection();
    if (stores) {
      return stores;
    }

    const preferredBase = resolvedBaseUrl || configuredBaseUrl || "/iiif";
    return emptyCollection(toUrl(preferredBase, "/collections/stores/collection.json"), "Stores");
  }

  async function resolveResource(
    slugOrUrl: string,
    forcedType?: IIIFResourceType | null
  ): Promise<AstroIiifClientResolvedResource> {
    if (isHttpUrl(slugOrUrl)) {
      const resource = asObject(await getJson(slugOrUrl));
      const type = (resource?.type as IIIFResourceType) || forcedType || null;
      return {
        slug: normalizeSlug(slugOrUrl),
        type,
        source: { type: "remote", url: slugOrUrl },
        resource,
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
    const sitemap = await getSitemap();
    const slugCandidates = getResourceSlugCandidates(requestedSlug, forcedType || null, routes);

    let slug = requestedSlug;
    let source: IIIFSitemapEntry["source"] | null = null;
    let sitemapType: IIIFResourceType | null = null;

    for (const candidate of slugCandidates) {
      const entry = sitemap[candidate];
      if (!entry) {
        continue;
      }
      slug = candidate;
      source = entry.source || null;
      sitemapType = (entry.type as IIIFResourceType) || null;
      break;
    }

    const remoteFromSource = source?.type === "remote" ? source.url || null : null;
    const localCandidates = Array.from(new Set([slug, ...slugCandidates]));

    let type: IIIFResourceType | null = forcedType || (sitemapType as IIIFResourceType | null);
    let localJsonUrl: string | null = null;
    let localSlug = slug;
    let resource: JsonObject | null = null;
    const remoteJsonUrl: string | null = remoteFromSource;

    if (remoteJsonUrl) {
      resource = asObject(await tryGetJson(remoteJsonUrl));
      if (!type && resource?.type && (resource.type === "Manifest" || resource.type === "Collection")) {
        type = resource.type as IIIFResourceType;
      }
    }

    if (!resource && (type === "Manifest" || (!type && sitemapType === "Manifest"))) {
      for (const candidate of localCandidates) {
        const localManifestResult = await tryGetJsonWithBaseFallback(`${candidate}/manifest.json`);
        localJsonUrl = localManifestResult?.url || null;
        resource = asObject(localManifestResult?.json);
        if (resource) {
          localSlug = candidate;
          type = "Manifest";
          break;
        }
      }
    }

    if (!resource && (type === "Collection" || (!type && sitemapType === "Collection"))) {
      for (const candidate of localCandidates) {
        const localCollectionResult = await tryGetJsonWithBaseFallback(`${candidate}/collection.json`);
        localJsonUrl = localCollectionResult?.url || null;
        resource = asObject(localCollectionResult?.json);
        if (resource) {
          localSlug = candidate;
          type = "Collection";
          break;
        }
      }
    }

    if (!resource && !type) {
      for (const candidate of localCandidates) {
        const tryManifestResult = await tryGetJsonWithBaseFallback(`${candidate}/manifest.json`);
        resource = asObject(tryManifestResult?.json);
        if (resource) {
          localSlug = candidate;
          localJsonUrl = tryManifestResult?.url || null;
          type = "Manifest";
          break;
        }
      }
    }

    if (!resource && !type) {
      for (const candidate of localCandidates) {
        const tryCollectionResult = await tryGetJsonWithBaseFallback(`${candidate}/collection.json`);
        resource = asObject(tryCollectionResult?.json);
        if (resource) {
          localSlug = candidate;
          localJsonUrl = tryCollectionResult?.url || null;
          type = "Collection";
          break;
        }
      }
    }

    if (!resource && remoteJsonUrl) {
      resource = asObject(await tryGetJson(remoteJsonUrl));
      if (!type && resource?.type && (resource.type === "Manifest" || resource.type === "Collection")) {
        type = resource.type as IIIFResourceType;
      }
    }

    const resolvedSlug = localJsonUrl ? localSlug : slug;
    const meta = resolvedSlug ? asObject((await tryGetJsonWithBaseFallback(`${resolvedSlug}/meta.json`))?.json) : null;
    const indices = resolvedSlug
      ? asObject((await tryGetJsonWithBaseFallback(`${resolvedSlug}/indices.json`))?.json)
      : null;

    return {
      slug: resolvedSlug,
      type,
      source,
      resource,
      meta,
      indices,
      links: {
        json: localJsonUrl || remoteJsonUrl,
        localJson: localJsonUrl,
        remoteJson: remoteJsonUrl,
      },
    };
  }

  async function loadManifest(slugOrUrl: string) {
    return resolveResource(slugOrUrl, "Manifest");
  }

  async function loadCollection(slugOrUrl: string) {
    return resolveResource(slugOrUrl, "Collection");
  }

  async function loadResourceFromParams(params: AstroParamsLike, param = "slug") {
    return resolveResource(slugFromParams(params, param));
  }

  async function loadManifestFromParams(params: AstroParamsLike, param = "slug") {
    return loadManifest(slugFromParams(params, param));
  }

  async function loadCollectionFromParams(params: AstroParamsLike, param = "slug") {
    return loadCollection(slugFromParams(params, param));
  }

  async function listSlugs(type?: IIIFResourceType) {
    const sitemap = await getSitemap();
    const entries = Object.entries(sitemap);
    if (!type) {
      return entries.map(([slug]) => slug);
    }
    return entries.filter(([, entry]) => entry?.type === type).map(([slug]) => slug);
  }

  async function getStaticPaths(type: IIIFResourceType, options: AstroIiifStaticPathOptions = {}) {
    const slugs = await listSlugs(type);
    const param = options.param || "slug";
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
    const slugs = extractItemSlugs(collection, {
      type: options.type,
      stripPrefix: options.stripPrefix,
      routes,
    });
    const param = options.param || "slug";
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

  return {
    clearCache: () => cache.clear(),
    slugFromParams,
    getSitemap,
    listSlugs,
    getAllManifests,
    getAllCollections,
    getAllStoreCollections,
    loadTopCollection,
    loadManifestsCollection,
    loadCollectionsCollection,
    loadStoreCollectionsCollection,
    loadResource: resolveResource,
    loadManifest,
    loadCollection,
    loadResourceFromParams,
    loadManifestFromParams,
    loadCollectionFromParams,
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
  };
}

export default createIiifAstroClient;
