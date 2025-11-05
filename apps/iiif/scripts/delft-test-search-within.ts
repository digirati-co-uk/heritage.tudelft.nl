import { getValue } from "@iiif/helpers";
import { extract } from "iiif-hss";

extract(
  {
    id: "delft-test-search-within",
    name: "Create canvas search index",
    types: ["Canvas"],
    invalidate: async () => true,
    search: {
      canvases: {
        allIndices: false,
        schema: {
          enable_nested_fields: true,
          fields: [
            { name: "id", type: "string" },
            { name: "type", type: "string" },
            // Reference the Manifests collection
            { name: "manifest_id", type: "string", reference: "manifests.id" },
            { name: "canvas_id", type: "string" },
            { name: "canvas_index", type: "string" },
            { name: "textFragments.text", type: "string[]" },
          ],
        },
      },
    },
  },
  async (resource, api, config) => {
    if (!(await api.resourceFiles.exists("search-export.json"))) {
      return {};
    }
    if (!api.parentResource || !api.parent) return {};

    const items = api.parent.items || [];
    const foundIndex = items.findIndex(
      (item: any) => item.id === api.resource.id,
    );

    const canvasHashId = resource.slug.replace("manifests/", "");
    const manifestHashId = api.parentResource.slug.replace("manifests/", "");

    // const search = await api.resourceFiles.loadJson("search-export.json");
    // if (!search) return {};

    return {
      search: {
        indexes: ["canvases"],
        record: {
          id: btoa(canvasHashId),
          type: "Canvas",
          manifest_id: btoa(manifestHashId),
          canvas_id: api.resource.id,
          canvas_index: foundIndex,
          textFragments: [],
        },
      },
    };
  },
);
