import { facetConfig } from "@/facets";
import TypesenseInstantSearchAdapter from "typesense-instantsearch-adapter";
import type { TypesenseInstantsearchAdapterOptions } from "typesense-instantsearch-adapter";
import { IIIF_URL } from "./iiif.client";
import {
  createSessionCacheKey,
  getSessionJSON,
  setSessionJSON,
} from "./search-session";

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
};

const searchConfiguration: TypesenseInstantsearchAdapterOptions = {
  server: typesenseServerConfig,
  additionalSearchParameters: {},
};

export async function createTypesense(randomSeed?: number) {
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
    per_page: 20,
  };

  const client = new TypesenseInstantSearchAdapter(searchConfiguration);
  const searchClient = client.searchClient as any;
  const search = searchClient.search.bind(searchClient);

  searchClient.search = async (requests: any[] | any) => {
    const isMultiSearch = Array.isArray(requests);
    const requestList = isMultiSearch ? requests : [requests];
    const cacheKey = getRandomSearchCacheKey(randomSeed, requestList);
    const cachedResponse = cacheKey ? getSessionJSON<any>(cacheKey) : undefined;

    if (cachedResponse) return cachedResponse;

    const randomizedRequests = requestList.map((request: any) =>
      withRandomSort(request, randomSeed),
    );
    const response = await search(
      isMultiSearch ? randomizedRequests : randomizedRequests[0],
    );

    if (cacheKey) {
      setSessionJSON(cacheKey, response);
    }

    return response;
  };

  return {
    facets: finalFacets,
    facetConfig,
    client,
    index: TYPESENSE_COLLECTION_NAME,
  };
}

function withRandomSort(request: any, randomSeed?: number) {
  const indexName = stripSort(request.indexName);
  const hasQuery = (request.params?.query || "").trim();

  return {
    ...request,
    indexName: hasQuery
      ? indexName
      : `${indexName}/sort/${getRandomSort(randomSeed)}`,
  };
}

function getRandomSort(randomSeed?: number) {
  return randomSeed ? `_rand(${randomSeed}):asc` : "_rand():asc";
}

function stripSort(indexName: string) {
  return indexName.replace(/\/sort\/.*$/, "");
}

function getRandomSearchCacheKey(
  randomSeed: number | undefined,
  requests: any[],
) {
  if (!randomSeed) return null;
  if (requests.some((request) => (request.params?.query || "").trim())) {
    return null;
  }

  return createSessionCacheKey("typesense-random", [
    randomSeed,
    requests.map((request) => ({
      indexName: stripSort(request.indexName),
      params: {
        ...(request.params || {}),
        query: "",
      },
    })),
  ]);
}
