"use client";

import { createTypesense } from "@/search";
import { createSeed, getSessionSeed, setSessionValue } from "@/search-session";
import { useEffect, useState } from "react";
import { InstantSearch } from "react-instantsearch";

type TypesenseSearch = Awaited<ReturnType<typeof createTypesense>>;
type SearchState = {
  search: TypesenseSearch;
  seed?: number;
};

type SearchWrapperChildren =
  | React.ReactNode
  | ((
      facets: string[],
      context: {
        search: TypesenseSearch;
        seed?: number;
        shuffle: () => void;
      },
    ) => React.ReactNode);

export function SearchWrapper(props: {
  children: SearchWrapperChildren;
  routing?: boolean;
  seedKey?: string;
}) {
  const [searchState, setSearchState] = useState<SearchState | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [shuffleCount, setShuffleCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const nextSeed = props.seedKey ? getSessionSeed(props.seedKey) : undefined;

    setSearchState(null);

    createTypesense(nextSeed)
      .then((nextSearch) => {
        if (mounted) {
          setSearchState({ search: nextSearch, seed: nextSeed });
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
  }, [props.seedKey, shuffleCount]);

  const shuffle = () => {
    if (!props.seedKey) return;
    const nextSeed = createSeed();
    setSessionValue(props.seedKey, String(nextSeed));
    setShuffleCount((count) => count + 1);
  };

  if (error) {
    return (
      <div className="my-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Search is temporarily unavailable.
      </div>
    );
  }

  if (!searchState) {
    return null;
  }

  const { search, seed } = searchState;

  const children =
    typeof props.children === "function"
      ? props.children(search.facets, { search, seed, shuffle })
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
