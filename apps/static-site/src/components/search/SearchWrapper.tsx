"use client";

import { createTypesense } from "@/search";
import { useEffect, useState } from "react";
import { InstantSearch } from "react-instantsearch";

type TypesenseSearch = Awaited<ReturnType<typeof createTypesense>>;

type SearchWrapperChildren =
  | React.ReactNode
  | ((facets: string[]) => React.ReactNode);

export function SearchWrapper(props: {
  children: SearchWrapperChildren;
  routing?: boolean;
}) {
  const [search, setSearch] = useState<TypesenseSearch | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    createTypesense()
      .then((nextSearch) => {
        if (mounted) {
          setSearch(nextSearch);
        }
      })
      .catch((err) => {
        console.error("Failed to initialize search", err);

        if (mounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Failed to initialize search"),
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <div className="my-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Search is temporarily unavailable.
      </div>
    );
  }

  if (!search) {
    return null;
  }

  const children =
    typeof props.children === "function"
      ? props.children(search.facets)
      : props.children;

  return (
    <InstantSearch
      searchClient={search.client.searchClient}
      indexName={search.index}
      routing={props.routing}
      future={{ preserveSharedStateOnUnmount: true }}
    >
      {children}
    </InstantSearch>
  );
}
