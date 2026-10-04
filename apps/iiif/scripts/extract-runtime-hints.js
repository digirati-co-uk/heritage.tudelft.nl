// Delft-owned build step, migrated from iiif-hss.
import { extract } from "iiif-hss";
function toRuntimeHints(resource) {
  const type =
    resource.type === "Manifest" || resource.type === "Collection"
      ? resource.type
      : null;
  if (!type) {
    return null;
  }
  const source = resource.source;
  if (!source || typeof source !== "object") {
    return null;
  }
  const portableSource =
    source.type === "remote" && typeof source.url === "string"
      ? { type: "remote", url: source.url }
      : source.type === "disk"
        ? { type: "disk" }
        : undefined;
  return {
    type,
    ...(portableSource ? { source: portableSource } : {}),
    saveToDisk: source.type === "disk" || Boolean(resource.saveToDisk),
  };
}
function asStableString(value) {
  return JSON.stringify(value || null);
}
export const extractRuntimeHints = {
  id: "extract-runtime-hints",
  name: "Extract runtime hints",
  types: ["Manifest", "Collection"],
  invalidate: async (resource, api) => {
    const expected = toRuntimeHints(resource);
    const caches = (await api.caches.value) || {};
    return caches[extractRuntimeHints.id] !== asStableString(expected);
  },
  handler: async (resource) => {
    const runtimeHints = toRuntimeHints(resource);
    return {
      caches: {
        [extractRuntimeHints.id]: asStableString(runtimeHints),
      },
      meta: {
        "hss:runtime": runtimeHints,
      },
    };
  },
};

extract(extractRuntimeHints, extractRuntimeHints.handler);
