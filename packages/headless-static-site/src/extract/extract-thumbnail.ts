import { createThumbnailHelper } from "@iiif/helpers";
import type { Extraction } from "../util/extract.ts";

type ExtractThumbnailConfig = {
  width: number;
  height: number;
  dereference: boolean;
};

export const extractThumbnail: Extraction = {
  id: "extract-thumbnail",
  name: "Extract Thumbnail",
  types: ["Manifest"],
  invalidate: async (resource, api, config) => {
    const cache = await api.caches.value;
    return !cache.extractThumbnail && cache.extractThumbnail !== false;
  },
  handler: async (resource, api, config) => {
    const vault = resource.vault;
    const helper = createThumbnailHelper(vault);
    const thumbnail = await helper.getBestThumbnailAtSize(
      api.resource,
      config.width
        ? {
            width: config.width,
            height: config.height || config.width,
          }
        : {
            width: 256,
            height: 256,
          },
      config.dereference || false
    );

    if (thumbnail?.best) {
      return {
        meta: { thumbnail: thumbnail.best },
        caches: { extractThumbnail: true },
      };
    }

    return {
      caches: { extractThumbnail: false },
    };
  },
};
