// Delft-owned build step, migrated from iiif-hss.
import { rewrite } from "iiif-hss";
export const flatManifests = {
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

rewrite(flatManifests);
