"use client";

import type { InternationalString } from "@iiif/presentation-3";
import { Hits } from "react-instantsearch";
import { Box } from "../blocks/Box";
import { SearchWrapper } from "../search/SearchWrapper";

export function HomepageSearch() {
  return (
    <SearchWrapper>
      <h3 className="mb-6 text-3xl font-medium">From our collection</h3>
      <div className="">
        <Hits
          classNames={{
            list: "grid md:grid-cols-4 grid-cols-2",
            item: "md:has-[.col-span-2]:col-span-2 md:has-[.row-span-2]:row-span-2",
          }}
          inlist={false}
          hitComponent={SearchHitHomepage}
        />
      </div>
    </SearchWrapper>
  );
}

const colors = [
  "bg-orange-500",
  "bg-yellow-400",
  "bg-orange-400",
  "bg-green-500",
  "bg-blue-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-purple-400",
];

function SearchHitHomepage({
  hit,
}: {
  hit: {
    type: string;
    thumbnail: string;
    label: string;
    full_label: InternationalString;
    slug: string;
    _highlightResult: any;
  };
}) {
  const url = `/${hit.slug}`;
  const result = hit._highlightResult as any;

  // const isOneInFourChance = Math.random() < 0.25 && (hit.__position + 1) % 4 === 0;
  const isOneInFourChance = false;

  return (
    <Box
      //
      link={url}
      small
      className={isOneInFourChance ? "col-span-2 row-span-2" : ""}
      backgroundColor={colors[Math.floor(Math.random() * colors.length)] as any}
      backgroundImage={hit.thumbnail}
      title={(<span dangerouslySetInnerHTML={{ __html: result.label.value }} />) as any}
      type={hit.type}
    />
  );
}
