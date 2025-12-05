import { facetConfig } from "@/facets";
import TypesenseInstantSearchAdapter from "typesense-instantsearch-adapter";
import type { TypesenseInstantsearchAdapterOptions } from "typesense-instantsearch-adapter";
import { IIIF_URL } from "./iiif.client";

const TYPESENSE_API_KEY =
  process.env.NEXT_PUBLIC_TYPESENSE_API_KEY ||
  "8EOitKCMTbxUKPZNqUEoQS9M2RGvpkZS";
const TYPESENSE_HOST =
  process.env.NEXT_PUBLIC_TYPESENSE_HOST ||
  "63flhve71t2un5xgp.a1.typesense.net";
const TYPESENSE_PORT = process.env.NEXT_PUBLIC_TYPESENSE_PORT
  ? Number.parseInt(process.env.NEXT_PUBLIC_TYPESENSE_PORT)
  : 443;
const TYPESENSE_PROTOCOL =
  process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || "https";
export const TYPESENSE_COLLECTION_NAME =
  process.env.NEXT_PUBLIC_TYPESENSE_COLLECTION_NAME || "production-manifests";

export const typesenseServerConfig = {
  apiKey: TYPESENSE_API_KEY,
  nodes: [
    {
      host: TYPESENSE_HOST,
      port: TYPESENSE_PORT,
      protocol: TYPESENSE_PROTOCOL,
    },
  ],
}

const searchConfiguration: TypesenseInstantsearchAdapterOptions = {
  server: typesenseServerConfig,
  additionalSearchParameters: {}
}

export async function createTypesense() {
  const manifestSchema: any = await fetch(
    `${IIIF_URL}meta/search/manifests.schema.json`,
  ).then((r) => r.json());

  // Get all topic fields from schema
  const allTopicFields = manifestSchema.fields
    .map((field: any) => {
      if (!field.name.startsWith("topic_")) return false;
      return field.name;
    })
    .filter((t: any) => t) as string[];

  // Apply facet config filtering and ordering
  const facets = allTopicFields
    .map((field) => field.replace("topic_", "")) // Remove topic_ prefix for config matching
    .filter((facet) => !facetConfig.exclude.includes(facet)); // Apply exclusions

  // Apply ordering based on facetConfig.order
  const orderedFacets: string[] = [];
  const unorderedFacets: string[] = [];

  // First, add facets in the specified order
  for (const orderedFacet of facetConfig.order) {
    if (facets.includes(orderedFacet)) {
      orderedFacets.push(`topic_${orderedFacet}`);
    }
  }

  // Then, add remaining facets that weren't in the order config
  for (const facet of facets) {
    if (!facetConfig.order.includes(facet)) {
      unorderedFacets.push(`topic_${facet}`);
    }
  }

  const finalFacets = [...orderedFacets, ...unorderedFacets];

  searchConfiguration.additionalSearchParameters = {
    query_by: `label,summary,type,plaintext,collections,${finalFacets.join(",")}`,
    highlight_fields: "label,summary",
    highlight_start_tag: "<mark>",
    highlight_end_tag: "</mark>",
    sort_by: "_rand():asc",
  };

  const client = new TypesenseInstantSearchAdapter(searchConfiguration);

  return {
    facets: finalFacets,
    facetConfig,
    client,
    index: TYPESENSE_COLLECTION_NAME,
  };
}

// Helper function to toggle random sorting at runtime:
export function updateSearchAdapter(query: string, adapter: TypesenseInstantSearchAdapter) {
  const params = searchConfiguration.additionalSearchParameters;
  const enable = query.trim().length === 0;
  if (params) {
      params.sort_by = enable ? "_rand():asc": ""
  }
  adapter.updateConfiguration(searchConfiguration);
}
