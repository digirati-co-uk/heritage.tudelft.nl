// src/dev/node-client.ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";

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
              console.log('Warning: Manifest slug should not start with "manifests/". Consider adding it to the prefix in the slug config');
            }
            if (isCollection && slug.startsWith("collections/")) {
              console.log('Warning: Collection slug should not start with "collections/". Consider adding it to the prefix in the slug config');
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

// src/dev/node-client.ts
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
    const res = await readFile(filePath);
    const json = JSON.parse(res.toString());
    cache[filePath] = json;
    return json;
  };
  const getSlugs = () => cachedGet(endpoints.slugs);
  const getStores = () => cachedGet(endpoints.stores);
  const getManifests = () => cachedGet(endpoints.manifests);
  const getTop = () => cachedGet(endpoints.top);
  const getEditable = () => cachedGet(endpoints.editable);
  const getOverrides = () => cachedGet(endpoints.overrides);
  const getSitemap = () => cachedGet(endpoints.sitemap);
  async function resolveFromSlug(slug, type) {
    const slugs = await getSlugs();
    const slugFns = Object.fromEntries(Object.entries(slugs || {}).map(([key, value]) => {
      if (type && value.type !== type) {
        return null;
      }
      return [key, { info: value, matches: compileReverseSlugConfig(value) }];
    }).filter((t) => t !== null));
    for (const slugFn of Object.values(slugFns || {})) {
      const [matches] = slugFn.matches(slug);
      if (matches) {
        return matches;
      }
    }
  }
  const slugHelperCache = { slugHelper: null };
  async function getSlugHelper() {
    if (slugHelperCache.slugHelper) {
      const slugs = await getSlugs();
      slugHelperCache.slugHelper = makeGetSlugHelper({ slugTemplates: Object.keys(slugs || {}) }, slugs || {});
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
  async function loadManifest(url_) {
    let url = url_;
    const overrides = await getOverrides();
    const urlWithoutSlash = url.startsWith("/") ? url.slice(1) : url;
    if (overrides?.[urlWithoutSlash]) {
      url = `/${overrides[urlWithoutSlash].replace("manifest.json", "")}`;
    }
    const remote = await resolveFromSlug(url, "Manifest");
    if (remote) {
      return {
        id: remote,
        meta: join(folderPath, url, "meta.json")
      };
    }
    if (!url.startsWith("/")) {
      url = `/${url}`;
    }
    return {
      id: `${url}/manifest.json`,
      meta: join(folderPath, url, "meta.json"),
      manifest: join(folderPath, url, "manifest.json")
    };
  }
  async function loadCollection(_url) {
    let url = _url;
    const overrides = await getOverrides();
    const urlWithoutSlash = url.startsWith("/") ? url.slice(1) : url;
    if (overrides?.[urlWithoutSlash]) {
      url = `/${overrides[urlWithoutSlash].replace("collection.json", "")}`;
    }
    const remote = await resolveFromSlug(url, "Collection");
    if (remote) {
      return {
        id: remote,
        meta: join(folderPath, url, "meta.json")
      };
    }
    if (!url.startsWith("/")) {
      url = `/${url}`;
    }
    return {
      id: `${url}/collection.json`,
      meta: join(folderPath, url, "meta.json"),
      collection: join(folderPath, url, "collection.json")
    };
  }
  return {
    endpoints,
    getSlugs,
    getStores,
    getManifests,
    loadCollection,
    getTop,
    getEditable,
    getOverrides,
    getSitemap,
    loadManifest,
    loadTopicType,
    loadTopic,
    urlToSlug,
    resolveFromSlug
  };
}
export {
  create
};
