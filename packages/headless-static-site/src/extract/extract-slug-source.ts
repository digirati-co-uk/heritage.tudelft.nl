import type { Extraction } from "../util/extract";

export const extractSlugSource: Extraction = {
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
