import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { IIIFRC } from "../util/get-config.ts";
import { makeGetSlugHelper } from "../util/make-slug-helper.ts";
import { resolveFromSlug } from "../util/resolve-from-slug.ts";
import { compileSlugConfig } from "../util/slug-engine.ts";

function normalizeSlug(value: string) {
  return value.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\/(manifest|collection)\.json$/i, "");
}

async function safeReadJson(filePath: string) {
  try {
    const res = await readFile(filePath);
    return JSON.parse(res.toString());
  } catch (error) {
    return {};
  }
}

export function create(folderPath: string) {
  const endpoints = {
    slugs: join(folderPath, "config/slugs.json"),
    stores: join(folderPath, "config/stores.json"),
    collection: join(folderPath, "collection.json"),
    editable: join(folderPath, "meta", "editable.json"),
    indices: join(folderPath, "meta", "indices.json"),
    "manifests.db": join(folderPath, "meta", "manifests.db"),
    manifests: join(folderPath, "manifests/collection.json"),
    overrides: join(folderPath, "meta", "overrides.json"),
    sitemap: join(folderPath, "meta", "sitemap.json"),
    top: join(folderPath, "collections", "collection.json"),
    topics: join(folderPath, "topics/collection.json"),
  };
  const cache: Record<string, any> = {};
  const cachedGet = async <T>(filePath: string): Promise<T> => {
    if (cache[filePath]) {
      return cache[filePath];
    }
    const json = await safeReadJson(filePath);
    cache[filePath] = json;
    return json;
  };

  const clearCache = () => {
    for (const key of Object.keys(cache)) {
      delete cache[key];
    }
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

  async function resolveFromSlugMatch(slug: string, type: "Manifest" | "Collection") {
    const slugs = await getSlugs();
    return resolveFromSlug(slug, type, (slugs || {}) as any);
  }

  const slugHelperCache = { slugHelper: null } as {
    slugHelper: null | ReturnType<typeof makeGetSlugHelper>;
  };
  async function getSlugHelper() {
    if (!slugHelperCache.slugHelper) {
      const slugs = await getSlugs();
      const compiledSlugs = Object.fromEntries(
        Object.entries(slugs || {}).map(([key, value]) => {
          return [key, { info: value, compile: compileSlugConfig(value as any) }];
        })
      );
      slugHelperCache.slugHelper = makeGetSlugHelper(
        { slugTemplates: Object.keys(compiledSlugs || {}) } as any,
        compiledSlugs as any
      );
    }
    return slugHelperCache.slugHelper;
  }

  async function urlToSlug(url: string, type?: string) {
    const helper = await getSlugHelper();
    if (!helper) {
      return null;
    }
    return helper({ id: url, type: type || "Manifest" });
  }

  async function resolveResource(slugOrPath: string) {
    const sitemap = await getSitemap();
    const editable = await getEditable();
    const normalized = normalizeSlug(slugOrPath);
    const siteEntry = sitemap?.[normalized] || null;
    const manifestPath = join(folderPath, normalized, "manifest.json");
    const collectionPath = join(folderPath, normalized, "collection.json");
    const metaPath = join(folderPath, normalized, "meta.json");
    const indicesPath = join(folderPath, normalized, "indices.json");

    const manifest = await safeReadJson(manifestPath);
    const collection = await safeReadJson(collectionPath);
    const meta = await safeReadJson(metaPath);
    const indices = await safeReadJson(indicesPath);

    const hasManifest = Boolean(manifest?.type === "Manifest" || manifest?.["@type"] === "sc:Manifest");
    const hasCollection = Boolean(collection?.type === "Collection" || collection?.["@type"] === "sc:Collection");
    const type = siteEntry?.type || (hasManifest ? "Manifest" : hasCollection ? "Collection" : null);

    const reverseManifest = await resolveFromSlugMatch(normalized, "Manifest");
    const reverseCollection = await resolveFromSlugMatch(normalized, "Collection");

    const localJsonPath =
      type === "Manifest"
        ? manifestPath
        : type === "Collection"
          ? collectionPath
          : hasManifest
            ? manifestPath
            : hasCollection
              ? collectionPath
              : null;

    const remoteJsonPath =
      siteEntry?.source?.type === "remote"
        ? siteEntry.source.url
        : type === "Manifest"
          ? reverseManifest?.match || null
          : type === "Collection"
            ? reverseCollection?.match || null
            : null;

    return {
      slug: normalized,
      type,
      source: siteEntry?.source || null,
      isEditable: Boolean(editable?.[normalized]),
      editablePath: editable?.[normalized] || null,
      localJsonPath,
      remoteJsonPath,
      meta,
      indices,
      reverse: {
        manifest: reverseManifest,
        collection: reverseCollection,
      },
      resource: hasManifest ? manifest : hasCollection ? collection : null,
    };
  }

  async function loadTopicType(name: string) {
    const pathToTopic = join(folderPath, "topics", name);

    return {
      collection: join(pathToTopic, "collection.json"),
      meta: join(pathToTopic, "meta.json"),
    };
  }
  async function loadTopic(type: string, name: string) {
    const pathToTopic = join(folderPath, "topics", type, name);

    return {
      collection: join(pathToTopic, "collection.json"),
      meta: join(pathToTopic, "meta.json"),
    };
  }

  async function loadManifest(slugOrUrl: string) {
    if (/^https?:\/\//i.test(slugOrUrl)) {
      return { id: slugOrUrl, meta: null, manifest: null };
    }
    const resolved = await resolveResource(slugOrUrl);
    if (resolved.type === "Manifest") {
      return {
        id: resolved.remoteJsonPath || resolved.localJsonPath,
        meta: join(folderPath, resolved.slug, "meta.json"),
        manifest: resolved.localJsonPath,
        debug: resolved,
      };
    }
    return null;
  }
  async function loadCollection(slugOrUrl: string) {
    if (/^https?:\/\//i.test(slugOrUrl)) {
      return { id: slugOrUrl, meta: null, collection: null };
    }
    const resolved = await resolveResource(slugOrUrl);
    if (resolved.type === "Collection") {
      return {
        id: resolved.remoteJsonPath || resolved.localJsonPath,
        meta: join(folderPath, resolved.slug, "meta.json"),
        collection: resolved.localJsonPath,
        debug: resolved,
      };
    }
    return null;
  }

  return {
    endpoints,
    clearCache,
    getSlugs,
    getStores,
    getManifests,
    getTop,
    getEditable,
    getOverrides,
    getSitemap,
    loadCollection,
    loadManifest,
    loadTopicType,
    loadTopic,
    resolveResource,
    urlToSlug,
  };
}
