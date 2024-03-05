"use client";

import { createTypesense } from "@/typesense";
import { InstantSearch } from "react-instantsearch";

const ts = createTypesense();

export function getFacets() {
  return ts.facets;
}

export function SearchWrapper(props: { children: React.ReactNode; routing?: boolean }) {
  return (
    <InstantSearch searchClient={ts.client.searchClient} indexName={ts.index} routing={props.routing}>
      {props.children}
    </InstantSearch>
  );
}
