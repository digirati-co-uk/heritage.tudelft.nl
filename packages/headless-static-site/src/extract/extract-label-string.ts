import { sha1 } from "object-hash";
import type { Extraction } from "../util/extract";

export const extractLabelString: Extraction = {
  id: "extract-label-string",
  name: "Extract label as string",
  types: ["Manifest"],
  async invalidate(manifest, api) {
    const resource = api.resource;
    if (!resource.label) {
      return false;
    }
    const hash = sha1(resource.label);
    const caches = await api.caches.value;
    return hash !== caches.extractLabelString;
  },
  async handler(manifest, api, config) {
    const language = config?.language;
    const resource = api.resource;
    if (!resource.label) {
      return {};
    }

    const label = resource.label || {};
    const keys = Object.keys(resource.label);
    if (keys.length === 0) {
      return {};
    }

    const firstValue = (label[language || keys[0]] || [])[0] || "";
    return {
      caches: {
        extractLabelString: sha1(resource.label),
      },
      meta: {
        label: firstValue,
      },
    };
  },
};

export function getValue(value: any) {
  const label = value || {};
  const keys = Object.keys(label);
  if (keys.length === 0) {
    return "";
  }
  return (label[keys[0]] || [])[0] || "";
}
