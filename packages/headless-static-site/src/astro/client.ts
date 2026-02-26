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

export interface AstroIiifClientOptions {
  baseUrl?: string;
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

function asObject(value: unknown) {
  return value && typeof value === "object" ? (value as JsonObject) : null;
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

    const slug = normalizeSlug(slugOrUrl);
    const sitemap = await getSitemap();
    const source = sitemap[slug]?.source || null;
    const sitemapType = sitemap[slug]?.type || null;
    const remoteFromSource = source?.type === "remote" ? source.url || null : null;

    let type: IIIFResourceType | null = forcedType || (sitemapType as IIIFResourceType | null);
    let localJsonUrl: string | null = null;
    let resource: JsonObject | null = null;
    const remoteJsonUrl: string | null = remoteFromSource;

    if (remoteJsonUrl) {
      resource = asObject(await tryGetJson(remoteJsonUrl));
      if (!type && resource?.type && (resource.type === "Manifest" || resource.type === "Collection")) {
        type = resource.type as IIIFResourceType;
      }
    }

    if (!resource && (type === "Manifest" || (!type && sitemapType === "Manifest"))) {
      const localManifestResult = await tryGetJsonWithBaseFallback(`${slug}/manifest.json`);
      localJsonUrl = localManifestResult?.url || null;
      resource = asObject(localManifestResult?.json);
      type = "Manifest";
    }

    if (!resource && (type === "Collection" || (!type && sitemapType === "Collection"))) {
      const localCollectionResult = await tryGetJsonWithBaseFallback(`${slug}/collection.json`);
      localJsonUrl = localCollectionResult?.url || null;
      resource = asObject(localCollectionResult?.json);
      type = "Collection";
    }

    if (!resource && !type) {
      const tryManifestResult = await tryGetJsonWithBaseFallback(`${slug}/manifest.json`);
      resource = asObject(tryManifestResult?.json);
      if (resource) {
        localJsonUrl = tryManifestResult?.url || null;
        type = "Manifest";
      }
    }

    if (!resource && !type) {
      const tryCollectionResult = await tryGetJsonWithBaseFallback(`${slug}/collection.json`);
      resource = asObject(tryCollectionResult?.json);
      if (resource) {
        localJsonUrl = tryCollectionResult?.url || null;
        type = "Collection";
      }
    }

    if (!resource && remoteJsonUrl) {
      resource = asObject(await tryGetJson(remoteJsonUrl));
      if (!type && resource?.type && (resource.type === "Manifest" || resource.type === "Collection")) {
        type = resource.type as IIIFResourceType;
      }
    }

    const shouldLoadLocalMetadata = !remoteJsonUrl || Boolean(localJsonUrl);
    const meta = shouldLoadLocalMetadata
      ? asObject((await tryGetJsonWithBaseFallback(`${slug}/meta.json`))?.json)
      : null;
    const indices = shouldLoadLocalMetadata
      ? asObject((await tryGetJsonWithBaseFallback(`${slug}/indices.json`))?.json)
      : null;

    return {
      slug,
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

  async function getStaticPaths(type: IIIFResourceType, options: { param?: string; split?: boolean } = {}) {
    const slugs = await listSlugs(type);
    const param = options.param || "slug";
    return slugs.map((slug) => ({
      params: {
        [param]: asAstroParam(slug, options.split || false),
      },
    }));
  }

  function getStaticPathsFromCollection(collection: JsonObject, options: { param?: string; split?: boolean } = {}) {
    const slugs = extractItemSlugs(collection);
    const param = options.param || "slug";
    return slugs.map((slug) => ({
      params: {
        [param]: asAstroParam(slug, options.split || false),
      },
    }));
  }

  return {
    clearCache: () => cache.clear(),
    slugFromParams,
    getSitemap,
    listSlugs,
    loadTopCollection,
    loadManifestsCollection,
    loadCollectionsCollection,
    loadResource: resolveResource,
    loadManifest,
    loadCollection,
    loadResourceFromParams,
    loadManifestFromParams,
    loadCollectionFromParams,
    getManifestStaticPaths: (options?: { param?: string; split?: boolean }) => getStaticPaths("Manifest", options),
    getCollectionStaticPaths: (options?: { param?: string; split?: boolean }) => getStaticPaths("Collection", options),
    getStaticPathsFromCollection,
  };
}

export default createIiifAstroClient;
