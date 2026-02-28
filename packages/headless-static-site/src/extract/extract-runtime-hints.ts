import type { Extraction } from "../util/extract.ts";

type RuntimeSource = {
  type: "disk" | "remote";
  [key: string]: any;
};

type RuntimeHints = {
  type: "Manifest" | "Collection";
  source: RuntimeSource;
  saveToDisk: boolean;
};

function toRuntimeHints(resource: { type: string; source: any; saveToDisk?: boolean }): RuntimeHints | null {
  const type = resource.type === "Manifest" || resource.type === "Collection" ? resource.type : null;
  if (!type) {
    return null;
  }

  const source = resource.source;
  if (!source || typeof source !== "object") {
    return null;
  }
  if (source.type !== "disk" && source.type !== "remote") {
    return null;
  }

  return {
    type,
    source: { ...source },
    saveToDisk: source.type === "disk" || Boolean(resource.saveToDisk),
  };
}

function asStableString(value: unknown) {
  return JSON.stringify(value || null);
}

export const extractRuntimeHints: Extraction = {
  id: "extract-runtime-hints",
  name: "Extract runtime hints",
  types: ["Manifest", "Collection"],
  alwaysRun: true,
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
