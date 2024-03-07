import TypesenseInstantSearchAdapter from "typesense-instantsearch-adapter";
import manifestSchema from "../public/iiif/meta/typesense/manifests.schema.json";

const TYPESENSE_API_KEY = process.env["TYPESENSE_API_KEY"] || "xyz";
const TYPESENSE_HOST = process.env["TYPESENSE_HOST"] || "localhost";
const TYPESENSE_PORT = process.env["TYPESENSE_PORT"] ? parseInt(process.env["TYPESENSE_PORT"]) : 8108;
const TYPESENSE_PROTOCOL = process.env["TYPESENSE_PROTOCOL"] || "http";

const typesenseServerConfig = {
  apiKey: TYPESENSE_API_KEY,
  nodes: [
    {
      host: TYPESENSE_HOST,
      port: TYPESENSE_PORT,
      protocol: TYPESENSE_PROTOCOL,
    },
  ],
};

export function createTypesense() {
  const facets = manifestSchema.fields
    .map((field) => {
      if (!field.name.startsWith("topic_")) return false;
      return field.name;
    })
    .filter((t) => t) as string[];

  const client = new TypesenseInstantSearchAdapter({
    server: typesenseServerConfig,
    additionalSearchParameters: {
      query_by: `label,summary,type,${facets.join(",")}`,
      highlight_fields: "label,summary,plaintext",
      highlight_start_tag: "<mark>",
      highlight_end_tag: "</mark>",
    },
  });

  return {
    facets,
    client,
    index: manifestSchema.name,
  };
}
