import TypesenseInstantSearchAdapter from "typesense-instantsearch-adapter";
import manifestSchema from "@repo/iiif/build/meta/typesense/manifests.schema.json";

const TYPESENSE_API_KEY = process.env["NEXT_PUBLIC_TYPESENSE_API_KEY"] || "xyz";
const TYPESENSE_HOST = process.env["NEXT_PUBLIC_TYPESENSE_HOST"] || "localhost";
const TYPESENSE_PORT = process.env["NEXT_PUBLIC_TYPESENSE_PORT"]
  ? parseInt(process.env["NEXT_PUBLIC_TYPESENSE_PORT"])
  : 8108;
const TYPESENSE_PROTOCOL = process.env["NEXT_PUBLIC_TYPESENSE_PROTOCOL"] || "http";
const TYPESENSE_COLLECTION_NAME = process.env["NEXT_PUBLIC_TYPESENSE_COLLECTION_NAME"] || "manifests";

export const typesenseServerConfig = {
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
      query_by: `label,summary,type,plaintext,${facets.join(",")}`,
      highlight_fields: "label,summary",
      highlight_start_tag: "<mark>",
      highlight_end_tag: "</mark>",
    },
  });

  return {
    facets,
    client,
    index: TYPESENSE_COLLECTION_NAME,
  };
}
