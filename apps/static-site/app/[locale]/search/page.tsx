"use client";

import { InternationalString } from "@iiif/presentation-3";
import TypesenseInstantSearchAdapter from "typesense-instantsearch-adapter";
import { InstantSearch, SearchBox, Hits, RefinementList } from "react-instantsearch";
import { Link } from "@/navigation";

const typesenseInstantsearchAdapter = new TypesenseInstantSearchAdapter({
  server: {
    apiKey: "xyz", // Be sure to use the search-only-api-key
    nodes: [
      {
        host: "localhost",
        port: 8108,
        protocol: "http",
      },
    ],
  },
  // The following parameters are directly passed to Typesense's search API endpoint.
  //  So you can pass any parameters supported by the search endpoint below.
  //  queryBy is required.
  additionalSearchParameters: {
    query_by: "label,type,topic_material,topic_Maker",
  },
});

function Hit({
  hit,
}: {
  hit: {
    thumbnail: string;
    label: string;
    full_label: InternationalString;
    slug: string;
  };
}) {
  return (
    <article>
      <h1>{hit.label}</h1>
      <img src={hit.thumbnail} />
      <Link href={hit.slug}>View</Link>
    </article>
  );
}

export default function SearchPage() {
  return (
    <div>
      <h1>Search</h1>
      <InstantSearch searchClient={typesenseInstantsearchAdapter.searchClient} indexName="manifests">
        <SearchBox />
        <RefinementList attribute="type" />
        <RefinementList attribute="topic_material" />
        <RefinementList attribute="topic_Maker" />
        <Hits hitComponent={Hit} />
      </InstantSearch>
    </div>
  );
}
