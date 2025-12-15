import { getValue } from "@iiif/helpers";
import type { Extraction } from "../util/extract";

export const extractSearchRecord: Extraction = {
  id: "extract-search-record",
  name: "Extract Search record for Manifests and Collections",
  types: ["Manifest", "Collection"],

  search: {
    // The name of the index is `manifests`, this extraction hooks in and extends the index.
    manifests: {
      allIndices: true,
      schema: {
        enable_nested_fields: true,
        fields: [
          { name: "id", type: "string" },
          { name: "type", type: "string", facet: true }, // Special case in the UI.
          { name: "label", type: "string" },
          { name: "full_label", type: "object", optional: true },
          { name: "summary", type: "string", optional: true },
          { name: "collections", type: "string[]", facet: true, optional: true },
          { name: "plaintext", type: "string", optional: true },
          { name: "slug", type: "string" },
          { name: "url", type: "string", optional: true },
          { name: "totalItems", type: "int32", optional: true },
          { name: "thumbnail", type: "string", index: false, optional: true },
        ],
      },
    },
  },

  async invalidate(manifest, api) {
    return true;
  },

  async handler(resource, api, config) {
    const startTime = performance.now();
    const id = resource.slug.replace("manifests/", "");
    const meta = await api.meta.value;
    const collections = meta.partOfCollections || [];

    const plaintext = (await api.resourceFiles.readFile("keywords.txt"))?.toString("utf-8") || "";

    // This is what we want to be able to support.
    return {
      meta: {
        searchTime: performance.now() - startTime,
      },
      search: {
        indexes: ["manifests"],
        record: {
          id: btoa(id),
          type: resource.type,
          slug: resource.slug,
          label: getValue(api.resource.label),
          full_label: api.resource.label,
          summary: getValue(api.resource.summary),
          thumbnail: meta.thumbnail?.id,
          url: meta.url,
          plaintext,
          totalItems: meta.totalItems,
          collections: collections.map((c: any) => c.slug),
        },
      },
    };
  },
};
