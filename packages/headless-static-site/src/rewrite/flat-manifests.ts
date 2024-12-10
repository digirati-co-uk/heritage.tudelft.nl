// Rewrite manifest paths to be flat.
import type { Rewrite } from "../util/rewrite.ts";

export const flatManifests: Rewrite = {
  id: "flat-manifests",
  name: "Flat manifests",
  types: ["Manifest", "Collection"],
  rewrite: (slug, resource) => {
    const isManifest = resource.type === "Manifest";
    const isCollection = resource.type === "Collection";

    if (isManifest) {
      const parts = slug.split("/");
      const lastPart = parts.pop();
      return `manifests/${lastPart}`;
    }
    if (isCollection) {
      const parts = slug.split("/");
      const lastPart = parts.pop();
      return `collections/${lastPart}`;
    }
    return slug;
  },
};
