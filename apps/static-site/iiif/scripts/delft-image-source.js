import { extract } from 'iiif-hss';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';

extract({
    id: 'delft-image-source',
    name: 'Delft image source',
    types: ['Manifest'],
    invalidate: async () => {
        return true;
    },
    collect: async (temp, api) => {
        // Create a file containing the reverse mapping.
        const imageServices = join(api.build.filesDir, "meta", "image-services.json");
        // Write to disk.
        // This will be a Record<string, string[]> where the key is the Manifest Slug and the value is an array of image service IDs.
        // We first need to flip this around to be a reverse mapping. Only one manifest per image service.
        const reverseMapping = {};
        for (const [manifestSlug, imageServiceIds] of Object.entries(temp)) {
            for (const imageServiceId of imageServiceIds) {
                reverseMapping[imageServiceId] = manifestSlug;
            }
        }
        await writeFile(imageServices, JSON.stringify(reverseMapping, null, 2));
    },
}, async (_, api) => {
    const foundServices = [];
    // 1. Find all image services (brute force, but it works).
    const resource = api.resource;
    if (resource && resource.items && resource.items.length) {
        for (const canvas of resource.items) {
            if (canvas.items && canvas.items.length) {
                const firstPage = canvas.items[0];
                for (const annotation of firstPage.items) {
                    const body = Array.isArray(annotation.body) ? annotation.body : [annotation.body];
                    if (body.length) {
                        for (const singleBody of body) {
                            if (singleBody && singleBody.service) {
                                const services = Array.isArray(singleBody.service) ? singleBody.service : [singleBody.service];
                                for (const service of services) {
                                    if (service && service.protocol === 'http://iiif.io/api/image') {
                                        const id = service.id || service['@id'];
                                        if (id) {
                                            foundServices.push(id);
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
    }
});
