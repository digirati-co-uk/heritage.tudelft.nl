import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { extract } from "iiif-hss";

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
          const imageServiceId = ctx.id;
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
  async (_, api) => {
    const foundServices = [];
    // 1. Find all image services (brute force, but it works).
    const resource = api.resource;
    if (resource?.items?.length) {
      for (const canvas of resource.items) {
        if (canvas.items?.length) {
          const firstPage = canvas.items[0];
          for (const annotation of firstPage.items) {
            const body = Array.isArray(annotation.body) ? annotation.body : [annotation.body];
            if (body.length) {
              for (const singleBody of body) {
                if (singleBody?.service) {
                  const services = Array.isArray(singleBody.service) ? singleBody.service : [singleBody.service];
                  for (const service of services) {
                    if (
                      service &&
                      (service.protocol === "http://iiif.io/api/image" ||
                        service.type === "ImageService3" ||
                        service.type === "ImageService2")
                    ) {
                      let id = service.id || service["@id"];
                      if (id) {
                        // Let's normalise the ID here.
                        if (id.includes("/thumbs/")) {
                          id = id.replace("/thumbs/", "/iiif-img/");
                        }
                        if (id.includes("/iiif-img/v3/")) {
                          id = id.replace("/iiif-img/v3/", "/iiif-img/");
                        }

                        foundServices.push({ id, canvasId: canvas.id });
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    if (foundServices.length === 0) {
      return {};
    }

    return {
      temp: foundServices,
    };
  },
);
