import { createThumbnailHelper } from "@iiif/helpers";
import { extract } from "iiif-hss";

extract({
  id: "extract-thumbnail-local",
  name: "Extract Thumbnail",
  types: ["Manifest"],
  invalidate: async (resource, api, config) => {
    const cache = await api.caches.value;
    return !cache.extractThumbnail && cache.extractThumbnail !== false;
  }},
  async (resource, api, config) => {
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
    else {
      const thumbnail = await helper.getBestThumbnailAtSize(
        api.resource, {
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
    }

    return {
      caches: { extractThumbnail: false },
    };
  },
)