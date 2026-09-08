// Delft-owned build step, migrated from iiif-hss.
import { extract } from "iiif-hss";
export const extractSlugSource = {
  id: "extract-slug-source",
  types: ["Manifest", "Collection"],
  name: "Extract slug source",
  handler: async (resource) => {
    return {
      meta: {
        slugSource: resource.slugSource,
        totalItems: resource.subResources,
      },
    };
  },
  invalidate: async () => {
    return true;
  },
};

extract(extractSlugSource, extractSlugSource.handler);
