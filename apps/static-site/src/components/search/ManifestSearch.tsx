"use client";

import { Configure, InfiniteHits, SearchBox, useCurrentRefinements, useHits, useSearchBox } from "react-instantsearch";
import { SearchWrapper, getFacets } from "./SearchWrapper";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { FacetList } from "./FacetList";
import { CollectionItemHit } from "./CollectionItemHit";

export function ManifestSearch({ collectionSlug }: { collectionSlug: string }) {
  const [dom, setDom] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setDom(document.getElementById("search-results"));
  }, []);

  return (
    <div>
      <SearchWrapper>
        <Configure facetsRefinements={{ collections: [collectionSlug] }} />

        {getFacets().map((facet) => {
          return <FacetList key={facet} facet={facet} />;
        })}

        {dom && createPortal(<ManifestHits />, dom)}
      </SearchWrapper>
    </div>
  );
}

function ManifestHits() {
  const { query } = useSearchBox();
  const { hits } = useHits();
  const { items } = useCurrentRefinements();

  const searchBox = (
    <SearchBox
      placeholder="Search collection..."
      classNames={{
        reset: "hidden",
        submit: "hidden",
        root: "mb-8",
        form: "flex bg-white gap-1",
        input:
          "flex-1 w-full px-2 py-2 text-lg bg-white border border-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-blue-500 focus:ring-1",
      }}
    />
  );

  if (items.length === 1 && !query) {
    return <div>{searchBox}</div>;
  }

  return (
    <div>
      {searchBox}

      <h3 className="mb-8 text-3xl font-bold leading-tight text-gray-900">Search results</h3>

      {hits.length === 0 ? (
        <div className="p-16 text-center font-mono text-xl text-gray-500">
          <p>No results found.</p>
        </div>
      ) : (
        <InfiniteHits
          classNames={{
            list: "grid grid-cols-1 gap-4 md:grid-cols-3",
            disabledLoadMore: "hidden",
          }}
          hitComponent={CollectionItemHit}
          showPrevious={false}
        />
      )}

      <hr className="my-8 border-b-2 border-slate-400" />
      <h3 className="mb-8 text-3xl font-bold leading-tight text-gray-900">All items</h3>
    </div>
  );
}
