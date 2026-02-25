// src/dev/node-client.ts
import { readFile } from "fs/promises";
import { join } from "path";

// src/util/make-slug-helper.ts
function getDefaultSlug(slug) {
  const url = new URL(slug);
  let path = url.pathname;
  let extension = "";
  const parts = path.split(".");
  const lastPart = parts[parts.length - 1];
  if (lastPart.indexOf(".") !== -1) {
    const pathParts = path.split(".");
    extension = pathParts.pop() || "";
    path = pathParts.join(".");
  }
  return [path, `default:${url.hostname}/${extension}`];
}
function makeGetSlugHelper(store, slugs) {
  if (store.slugTemplates) {
    return (resource) => {
      const isManifest = resource.type === "Manifest";
      const isCollection = resource.type === "Collection";
      for (const slugTemplate of store.slugTemplates || []) {
        const compiled = slugs[slugTemplate];
        if (compiled && compiled.info.type === resource.type) {
          let [slug] = compiled.compile(resource.id);
          if (slug) {
            if (isManifest && slug.startsWith("manifests/")) {
              console.log(
                'Warning: Manifest slug should not start with "manifests/". Consider adding it to the prefix in the slug config'
              );
            }
            if (isCollection && slug.startsWith("collections/")) {
              console.log(
                'Warning: Collection slug should not start with "collections/". Consider adding it to the prefix in the slug config'
              );
            }
            if (isManifest && !slug.startsWith("manifests/")) {
              slug = `manifests/${slug}`;
            }
            if (isCollection && !slug.startsWith("collections/")) {
              slug = `collections/${slug}`;
            }
            return [slug, slugTemplate];
          }
        }
      }
      return getDefaultSlug(resource.id);
    };
  }
  return (resource) => {
    return getDefaultSlug(resource.id);
  };
}

// src/util/slug-engine.ts
var NO_MATCH = [null, null];
function compileSlugConfig(config) {
  if (config.pattern) {
    throw new Error("config.pattern is no longer supported.");
  }
  return (slug) => {
    const slugUrl = new URL(slug);
    if (slugUrl.hostname !== config.domain) {
      return NO_MATCH;
    }
    const path = slugUrl.pathname;
    if (config.prefix && !path.startsWith(config.prefix)) {
      return NO_MATCH;
    }
    if (config.suffix && !path.endsWith(config.suffix)) {
      return NO_MATCH;
    }
    const pathWithoutPrefix = config.prefix ? path.slice(config.prefix.length) : path;
    let pathWithoutSuffix = config.suffix ? pathWithoutPrefix.slice(0, -config.suffix.length) : pathWithoutPrefix;
    if (pathWithoutSuffix.startsWith("/")) {
      pathWithoutSuffix = pathWithoutSuffix.slice(1);
    }
    if (config.pathSeparator) {
      pathWithoutSuffix = pathWithoutSuffix.replaceAll("/", config.pathSeparator);
    }
    if (config.addedPrefix) {
      pathWithoutSuffix = config.addedPrefix + pathWithoutSuffix;
    }
    return [pathWithoutSuffix, { path: pathWithoutSuffix }];
  };
}
function removeTrailingSlash(str) {
  if (str.endsWith("/")) {
    return str.slice(0, -1);
  }
  return str;
}
function compileReverseSlugConfig(config) {
  const pathSeparator = config.pathSeparator ? new RegExp(config.pathSeparator, "g") : null;
  return (targetPath) => {
    const domain = removeTrailingSlash(config.domain);
    let path = removeTrailingSlash(targetPath);
    const prefix = config.prefix || "";
    const suffix = config.suffix || "";
    if (path.startsWith("/")) {
      path = path.slice(1);
    }
    if (path.startsWith("manifests/")) {
      path = path.slice("manifests/".length);
    }
    if (path.startsWith("collections/")) {
      path = path.slice("collections/".length);
    }
    if (config.addedPrefix) {
      if (!path.startsWith(config.addedPrefix)) {
        return NO_MATCH;
      }
      path = path.slice(config.addedPrefix.length);
    }
    const parts = [`${config.protocol || "https"}://${domain}`];
    if (prefix) {
      parts.push(prefix);
    }
    if (pathSeparator) {
      parts.push(path.replace(pathSeparator, "/"));
    } else {
      parts.push(path);
    }
    if (suffix) {
      parts.push(suffix);
    }
    return [parts.join(""), { path }];
  };
}

// src/util/resolve-from-slug.ts
function resolveFromSlug(slug_, type, config, quiet = true) {
  let slug = slug_;
  const candidates = [];
  const keys = Object.keys(config);
  for (const key of keys) {
    const configItem = config[key];
    if (configItem.type !== type) {
      continue;
    }
    const addedPrefix = configItem.addedPrefix ? configItem.addedPrefix.startsWith("/") ? configItem.addedPrefix : `/${configItem.addedPrefix}` : "/";
    const matchingPrefix = `${type.toLowerCase()}s${addedPrefix}`;
    if (matchingPrefix.startsWith("/") && !slug.startsWith("/")) {
      slug = `/${slug}`;
    }
    if (!matchingPrefix.startsWith("/") && slug.startsWith("/")) {
      slug = slug.slice(1);
    }
    if (!slug.startsWith(matchingPrefix)) {
      continue;
    }
    const matcher = compileReverseSlugConfig(configItem);
    const [match, vars] = matcher(slug);
    if (match) {
      candidates.push({
        match,
        vars,
        key
      });
    }
  }
  if (candidates.length === 0) {
    return null;
  }
  if (candidates.length > 1 && !quiet) {
    throw new Error(`Multiple matches for slug ${slug} and type ${type}`);
  }
  return candidates[0];
}

// src/dev/node-client.ts
function normalizeSlug(value) {
  return value.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\/(manifest|collection)\.json$/i, "");
}
async function safeReadJson(filePath) {
  try {
    const res = await readFile(filePath);
    return JSON.parse(res.toString());
  } catch (error) {
    return {};
  }
}
function create(folderPath) {
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
    topics: join(folderPath, "topics/collection.json")
  };
  const cache = {};
  const cachedGet = async (filePath) => {
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
  const getSlugs = () => cachedGet(endpoints.slugs);
  const getStores = () => cachedGet(endpoints.stores);
  const getManifests = () => cachedGet(endpoints.manifests);
  const getTop = () => cachedGet(endpoints.top);
  const getEditable = () => cachedGet(endpoints.editable);
  const getOverrides = () => cachedGet(endpoints.overrides);
  const getSitemap = () => cachedGet(endpoints.sitemap);
  async function resolveFromSlugMatch(slug, type) {
    const slugs = await getSlugs();
    return resolveFromSlug(slug, type, slugs || {});
  }
  const slugHelperCache = { slugHelper: null };
  async function getSlugHelper() {
    if (!slugHelperCache.slugHelper) {
      const slugs = await getSlugs();
      const compiledSlugs = Object.fromEntries(
        Object.entries(slugs || {}).map(([key, value]) => {
          return [key, { info: value, compile: compileSlugConfig(value) }];
        })
      );
      slugHelperCache.slugHelper = makeGetSlugHelper(
        { slugTemplates: Object.keys(compiledSlugs || {}) },
        compiledSlugs
      );
    }
    return slugHelperCache.slugHelper;
  }
  async function urlToSlug(url, type) {
    const helper = await getSlugHelper();
    if (!helper) {
      return null;
    }
    return helper({ id: url, type: type || "Manifest" });
  }
  async function resolveResource(slugOrPath) {
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
    const localJsonPath = type === "Manifest" ? manifestPath : type === "Collection" ? collectionPath : hasManifest ? manifestPath : hasCollection ? collectionPath : null;
    const remoteJsonPath = siteEntry?.source?.type === "remote" ? siteEntry.source.url : type === "Manifest" ? reverseManifest?.match || null : type === "Collection" ? reverseCollection?.match || null : null;
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
        collection: reverseCollection
      },
      resource: hasManifest ? manifest : hasCollection ? collection : null
    };
  }
  async function loadTopicType(name) {
    const pathToTopic = join(folderPath, "topics", name);
    return {
      collection: join(pathToTopic, "collection.json"),
      meta: join(pathToTopic, "meta.json")
    };
  }
  async function loadTopic(type, name) {
    const pathToTopic = join(folderPath, "topics", type, name);
    return {
      collection: join(pathToTopic, "collection.json"),
      meta: join(pathToTopic, "meta.json")
    };
  }
  async function loadManifest(slugOrUrl) {
    if (/^https?:\/\//i.test(slugOrUrl)) {
      return { id: slugOrUrl, meta: null, manifest: null };
    }
    const resolved = await resolveResource(slugOrUrl);
    if (resolved.type === "Manifest") {
      return {
        id: resolved.remoteJsonPath || resolved.localJsonPath,
        meta: join(folderPath, resolved.slug, "meta.json"),
        manifest: resolved.localJsonPath,
        debug: resolved
      };
    }
    return null;
  }
  async function loadCollection(slugOrUrl) {
    if (/^https?:\/\//i.test(slugOrUrl)) {
      return { id: slugOrUrl, meta: null, collection: null };
    }
    const resolved = await resolveResource(slugOrUrl);
    if (resolved.type === "Collection") {
      return {
        id: resolved.remoteJsonPath || resolved.localJsonPath,
        meta: join(folderPath, resolved.slug, "meta.json"),
        collection: resolved.localJsonPath,
        debug: resolved
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
    urlToSlug
  };
}
export {
  create
};
