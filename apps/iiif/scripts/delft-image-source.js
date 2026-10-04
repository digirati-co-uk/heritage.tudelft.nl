import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { extract } from "iiif-hss";
import { getManifestImageServices } from "iiif-hss/library";

extract(
  {
    id: "delft-image-source",
    name: "Delft image source",
    types: ["Manifest"],
    invalidate: async () => {
      return true;
    },
    collect: async (temp, api) => {
      // Sample that is not working.
      // https://dlc.services/thumbs/7/6/26266921-71ad-4692-aa85-3257b2d5d036
      // https://dlc.services/iiif-img/7/6/26266921-71ad-4692-aa85-3257b2d5d036
      // https://dlc.services/iiif-img/v3/7/6/26266921-71ad-4692-aa85-3257b2d5d036
      // /manifests/dlcs/lib-tresor/trt-784.json

      // Create a file containing the reverse mapping.
      const imageServicesRaw = join(api.build.filesDir, "meta", "image-services-raw.json");
      const imageServices = join(api.build.filesDir, "meta", "image-services.json");
      const imageServiceLinks = join(api.build.filesDir, "meta", "image-service-links.json");
      // Write to disk.
      // This will be a Record<string, string[]> where the key is the Manifest Slug and the value is an array of image service IDs.
      // We first need to flip this around to be a reverse mapping. Only one manifest per image service.
      const reverseMapping = {};
      const links = [];
      for (const [manifestSlug, imageServicesItems] of Object.entries(temp)) {
        for (const ctx of imageServicesItems) {
          const canvasId = ctx.canvasId;
          let imageServiceId = ctx.id;

          if (imageServiceId.includes("/thumbs/")) {
            imageServiceId = imageServiceId.replace("/thumbs/", "/iiif-img/");
          }
          if (imageServiceId.includes("/iiif-img/v3/")) {
            imageServiceId = imageServiceId.replace("/iiif-img/v3/", "/iiif-img/");
          }

          reverseMapping[imageServiceId] = reverseMapping[imageServiceId] || [];
          reverseMapping[imageServiceId].push({
            manifest: manifestSlug,
            canvasId: canvasId,
          });

          if (reverseMapping[imageServiceId].length > 1 && !links.includes(imageServiceId)) {
            links.push(imageServiceId);
          }
        }
      }

      if (links.length) {
        const linkMapping = {};
        for (const link of links) {
          const manifests = reverseMapping[link];
          for (const ctx of manifests) {
            const manifest = ctx.manifest;
            const toLink = [];
            const toAdd = manifests.filter((m) => m !== ctx);
            if (toAdd.length) {
              for (const item of toAdd) {
                const wasFound =
                  (linkMapping[manifest] || []).find((i) => i.service === link) ||
                  toLink.find((i) => i.service === item.service);

                if (!wasFound) {
                  // Maybe this is wrong..
                  if (manifest === item.manifest) continue;
                  toLink.push({
                    slug: item.manifest,
                    service: link,
                    canvasId: ctx.canvasId,
                    targetCanvasId: item.canvasId,
                  });
                }
              }
              if (toLink.length) {
                linkMapping[manifest] = linkMapping[manifest] || [];
                linkMapping[manifest].push(...toLink);
              }
            }
          }
        }

        await writeFile(imageServiceLinks, JSON.stringify(linkMapping, null, 2));
      }

      await writeFile(imageServices, JSON.stringify(reverseMapping, null, 2));
      await writeFile(imageServicesRaw, JSON.stringify(temp, null, 2));
    },
  },
  async (resource) => {
    const services = getManifestImageServices(resource.vault, resource.id).map(({ id, canvasId }) => ({
      id: id.replace("/thumbs/", "/iiif-img/").replace("/iiif-img/v3/", "/iiif-img/"),
      canvasId,
    }));
    return services.length ? { temp: services } : {};
  },
);
