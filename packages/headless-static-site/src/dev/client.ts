import type { IIIFRC } from "../util/get-config.ts";
import { resolveFromSlug } from "../util/resolve-from-slug.ts";

function normalizeSlug(input: string) {
  return input.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\/(manifest|collection)\.json$/i, "");
}

function asEncodedSlugPath(slug: string) {
  return normalizeSlug(slug)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function create(
  url: string,
  options: {
    ws?: boolean;
    onFullRebuild?: () => void;
    onChangeFile?: () => void;
    debugBasePath?: string;
  } = {}
) {
  const root = new URL(url);
  const rootUrl = root.href.endsWith("/") ? root.href.slice(0, -1) : root.href;
  const debugBase = options.debugBasePath || `${rootUrl}/_debug`;
  const endpoints = {
    slugs: `${rootUrl}/config/slugs.json`,
    stores: `${rootUrl}/config/stores.json`,
    manifests: `${rootUrl}/manifests/collection.json`,
    top: `${rootUrl}/collections/collection.json`,
    sitemap: `${rootUrl}/meta/sitemap.json`,
    editable: `${rootUrl}/meta/editable.json`,
    overrides: `${rootUrl}/meta/overrides.json`,
    debugSite: `${debugBase}/api/site`,
    debugResource: (slug: string) => `${debugBase}/api/resource/${asEncodedSlugPath(slug)}`,
    debugTrace: `${debugBase}/api/trace`,
  };

  let cache: Record<string, any> = {};

  if (options.ws) {
    const wsUrl = new URL(rootUrl);
    wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
    wsUrl.pathname = "/ws";
    const ws = new WebSocket(wsUrl.toString());
    ws.onopen = () => ws.send("ping");
    ws.onmessage = (event) => {
      if (event.data === "file-refresh") {
        clearCache();
        options.onChangeFile?.();
      }
      if (event.data === "full-rebuild") {
        clearCache();
        options.onFullRebuild?.();
      }
    };
  }

  const clearCache = () => {
    cache = {};
  };

  const cachedGet = async <T>(targetUrl: string): Promise<T> => {
    if (cache[targetUrl]) {
      return cache[targetUrl];
    }
    const res = await fetch(targetUrl);
    if (!res.ok) {
      throw new Error(`Failed to load ${targetUrl}: ${res.status}`);
    }
    const json = await res.json();
    cache[targetUrl] = json;
    return json;
  };

  const getSlugs = () => cachedGet<IIIFRC["slugs"]>(endpoints.slugs);
  const getStores = () => cachedGet<IIIFRC["stores"]>(endpoints.stores);
  const getManifests = () => cachedGet<any>(endpoints.manifests);
  const getTop = () => cachedGet<any>(endpoints.top);
  const getEditable = () => cachedGet<Record<string, string>>(endpoints.editable);
  const getOverrides = () => cachedGet<Record<string, string>>(endpoints.overrides);
  const getSitemap = () =>
    cachedGet<
      Record<
        string,
        {
          type: string;
          source: { type: "disk"; path: string } | { type: "remote"; url: string };
        }
      >
    >(endpoints.sitemap);
  const getDebugSite = () => cachedGet<any>(endpoints.debugSite);
  const getDebugTrace = () => cachedGet<any>(endpoints.debugTrace);

  async function getFromSlug(slug: string, type: "Manifest" | "Collection") {
    const slugs = await getSlugs();
    return resolveFromSlug(slug, type, (slugs || {}) as any);
  }

  async function resolveResource(slug: string) {
    return cachedGet<any>(endpoints.debugResource(slug));
  }

  async function getManifest(slugOrUrl: string) {
    if (/^https?:\/\//i.test(slugOrUrl)) {
      return slugOrUrl;
    }
    const resource = await resolveResource(slugOrUrl).catch(() => null);
    if (resource?.links?.json) {
      return resource.links.json;
    }

    const normalized = normalizeSlug(slugOrUrl);
    const override = (await getOverrides())[normalized];
    if (override) {
      return `${rootUrl}/${override.replace(/^\/+/, "")}`;
    }

    const remote = await getFromSlug(normalized, "Manifest");
    if (remote) {
      return remote.match;
    }
    return `${rootUrl}/${normalized}/manifest.json`;
  }

  async function getCollection(slugOrUrl: string) {
    if (/^https?:\/\//i.test(slugOrUrl)) {
      return slugOrUrl;
    }
    const resource = await resolveResource(slugOrUrl).catch(() => null);
    if (resource?.links?.json) {
      return resource.links.json;
    }

    const normalized = normalizeSlug(slugOrUrl);
    const override = (await getOverrides())[normalized];
    if (override) {
      return `${rootUrl}/${override.replace(/^\/+/, "")}`;
    }

    const remote = await getFromSlug(normalized, "Collection");
    if (remote) {
      return remote.match;
    }
    return `${rootUrl}/${normalized}/collection.json`;
  }

  async function loadManifest(slugOrUrl: string) {
    const manifestUrl = await getManifest(slugOrUrl);
    const resource = /^https?:\/\//i.test(slugOrUrl) ? null : await resolveResource(slugOrUrl).catch(() => null);
    return {
      manifestUrl,
      resource,
    };
  }

  async function loadCollection(slugOrUrl: string) {
    const collectionUrl = await getCollection(slugOrUrl);
    const resource = /^https?:\/\//i.test(slugOrUrl) ? null : await resolveResource(slugOrUrl).catch(() => null);
    return {
      collectionUrl,
      resource,
    };
  }

  return {
    endpoints,
    clearCache,
    getSlugs,
    getStores,
    getManifests,
    getTop,
    getSitemap,
    getEditable,
    getOverrides,
    getDebugSite,
    getDebugTrace,
    resolveResource,
    getManifest,
    getCollection,
    loadManifest,
    loadCollection,
  };
}
