import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { extract } from "iiif-hss";

// Compare service identities, not rendered image URLs (whose sizes may differ).
function normalizeImageServiceId(id) {
  return id.replace(/\/(?:iiif-img|thumbs)\/(?:v[23]\/)?/, "/iiif-img/").replace(/\/$/, "");
}

extract(
  {
    id: "delft-image-source",
    name: "Delft image source",
    types: ["Manifest"],
    invalidate: async () => {
      return true;
    },
    collect: async (temp, api) => {
      // Create a file containing the reverse mapping.
      const imageServicesRaw = join(api.build.filesDir, "meta", "image-services-raw.json");
      const imageServices = join(api.build.filesDir, "meta", "image-services.json");
      const imageServiceLinks = join(api.build.filesDir, "meta", "image-service-links.json");
      // Write to disk.
      // This will be a Record<string, string[]> where the key is the Manifest Slug and the value is an array of image service IDs.
      // Index every manifest and canvas that uses each image service.
      const reverseMapping = {};
      const links = [];
      for (const [manifestSlug, imageServicesItems] of Object.entries(temp)) {
        for (const ctx of imageServicesItems) {
          const canvasId = ctx.canvasId;
          const imageServiceId = normalizeImageServiceId(ctx.id);

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

      const linkMapping = {};
      for (const link of links) {
        const manifests = reverseMapping[link];
        for (const ctx of manifests) {
          for (const item of manifests) {
            if (ctx.manifest === item.manifest) continue;
            linkMapping[ctx.manifest] ||= [];
            const manifestLinks = linkMapping[ctx.manifest];
            // One relation per image, source canvas, destination manifest and canvas.
            const wasFound = manifestLinks.some(
              (existing) =>
                existing.service === link &&
                existing.canvasId === ctx.canvasId &&
                existing.slug === item.manifest &&
                existing.targetCanvasId === item.canvasId,
            );
            if (!wasFound) {
              manifestLinks.push({
                slug: item.manifest,
                service: link,
                canvasId: ctx.canvasId,
                targetCanvasId: item.canvasId,
              });
            }
          }
        }
      }

      // Also clear stale relations when no shared images remain.
      await writeFile(imageServiceLinks, JSON.stringify(linkMapping, null, 2));

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
          for (const page of canvas.items) {
            for (const annotation of page.items || []) {
              const body = Array.isArray(annotation.body) ? annotation.body : [annotation.body];
              if (body.length) {
                for (const singleBody of body) {
                  if (singleBody?.service) {
                    const services = Array.isArray(singleBody.service) ? singleBody.service : [singleBody.service];
                    for (const service of services) {
                      if (
                        service &&
                        (service.protocol === "http://iiif.io/api/image" ||
                          ["ImageService2", "ImageService3"].includes(service.type || service["@type"]))
                      ) {
                        const serviceId = service.id || service["@id"];
                        if (serviceId) {
                          const id = normalizeImageServiceId(serviceId);
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
    }

    if (foundServices.length === 0) {
      return {};
    }

    return {
      temp: foundServices,
    };
  },
);
