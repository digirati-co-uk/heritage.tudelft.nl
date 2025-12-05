"use client";

import { createTypesense } from "@/search";
import { InstantSearch } from "react-instantsearch";

const ts = await createTypesense();

export function getFacets() {
  return ts.facets;
}

export function SearchWrapper(props: { children: React.ReactNode; routing?: boolean }) {
  return (
    <InstantSearch
      searchClient={ts.client.searchClient}
      indexName={ts.index}
      routing={props.routing}
      future={{ preserveSharedStateOnUnmount: true }}
    >
      {props.children}
    </InstantSearch>
  );
}
