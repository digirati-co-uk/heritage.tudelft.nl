import { extract } from "iiif-hss";

extract(
  {
    id: "delft-linked-alto",
    name: "Create canvas search index from alto",
    types: ["Canvas"],
    invalidate: async (_, api) => true,
  },
  async (resource, api, config) => {
    if (!api.parentResource || !api.parent || !api.parentResourceFiles) return {};

    if (!(await api.parentResourceFiles.exists("ocr-links.json"))) {
      return {};
    }

    const items = api.parent.items || [];
    const foundIndex = items.findIndex((item) => item.id === api.resource.id);

    const ocr = await api.parentResourceFiles.loadJson("ocr-links.json");
    const canvasHashId = resource.slug.replace("manifests/", "");
    const manifestHashId = api.parentResource.slug.replace("manifests/", "");

    const remoteAltoFile = ocr?.alto?.[foundIndex];

    const width = api.resource.width;
    const height = api.resource.height;

    if (!remoteAltoFile) {
      return {};
    }

    return {
      search: {
        indexes: ["canvases"],
        remoteRecords: {
          canvases: [
            {
              format: "alto-xml",
              recordId: btoa(canvasHashId),
              canvas: { w: width, h: height },
              canvasIndex: foundIndex,
              url: remoteAltoFile,
            },
          ],
        },
        record: {
          id: btoa(canvasHashId),
          type: "Canvas",
          manifest_id: btoa(manifestHashId),
          canvas_id: api.resource.id,
          canvas_index: foundIndex,
        },
      },
    };
  },
);
