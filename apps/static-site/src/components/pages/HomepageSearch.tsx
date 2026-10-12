"use client";

import type { InternationalString } from "@iiif/presentation-3";
import { block } from "@page-blocks/react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Box } from "../blocks/Box";
import { SearchWrapper } from "../search/SearchWrapper";

const mainTypes = ["Object", "Exhibition", "Collection", "Publication"];
const gridSizeClassNames = {
  small: "grid-cols-2 md:grid-cols-4",
  medium: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  large: "grid-cols-1 md:grid-cols-2",
};
const colorClassNames = [
  "bg-orange-500",
  "bg-yellow-400",
  "bg-orange-400",
  "bg-green-500",
  "bg-blue-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-purple-400",
] as const;
const categoryColorKeys = [
  "object",
  "exhibition",
  "collection",
  "publication",
] as const;
const defaultCategoryColors = {
  object: "bg-orange-500",
  exhibition: "bg-green-500",
  collection: "bg-blue-500",
  publication: "bg-purple-400",
} satisfies Record<CategoryColorKey, ColorClassName>;

type HomepageSearchSize = keyof typeof gridSizeClassNames;
type ColorClassName = (typeof colorClassNames)[number];
type CategoryColorKey = (typeof categoryColorKeys)[number];
type CategoryColors = Record<CategoryColorKey, ColorClassName>;
type HomepageSearchColorOptions = {
  useCategoryColors: boolean;
  categoryColors: CategoryColors;
};

type HomepageHit = {
  id: string;
  type: string;
  thumbnail?: string;
  label: string;
  full_label?: InternationalString;
  slug: string;
  _highlightResult?: any;
};

export function HomepageSearch({
  count = 8,
  includeMainCategories = true,
  useCategoryColors = false,
  objectColor = defaultCategoryColors.object,
  exhibitionColor = defaultCategoryColors.exhibition,
  collectionColor = defaultCategoryColors.collection,
  publicationColor = defaultCategoryColors.publication,
  randomizeCategorySlots = false,
  showShuffle = true,
  size = "small",
  title = "From our collection",
}: {
  count?: number;
  includeMainCategories?: boolean;
  useCategoryColors?: boolean;
  objectColor?: ColorClassName;
  exhibitionColor?: ColorClassName;
  collectionColor?: ColorClassName;
  publicationColor?: ColorClassName;
  randomizeCategorySlots?: boolean;
  showShuffle?: boolean;
  size?: HomepageSearchSize;
  title?: string;
}) {
  return (
    <SearchWrapper seedKey="heritage-homepage-search-seed">
      {(_, { search, seed, shuffle }) => (
        <HomepageSearchResults
          colorOptions={{
            useCategoryColors,
            categoryColors: {
              object: objectColor,
              exhibition: exhibitionColor,
              collection: collectionColor,
              publication: publicationColor,
            },
          }}
          count={count}
          includeMainCategories={includeMainCategories}
          randomizeCategorySlots={randomizeCategorySlots}
          search={search}
          seed={seed}
          showShuffle={showShuffle}
          size={size}
          shuffle={shuffle}
          title={title}
        />
      )}
    </SearchWrapper>
  );
}

function HomepageSearchResults({
  colorOptions,
  count,
  includeMainCategories,
  randomizeCategorySlots,
  search,
  seed,
  showShuffle,
  size,
  shuffle,
  title,
}: {
  colorOptions: HomepageSearchColorOptions;
  count: number;
  includeMainCategories: boolean;
  randomizeCategorySlots: boolean;
  search: any;
  seed?: number;
  showShuffle: boolean;
  size: HomepageSearchSize;
  shuffle: () => void;
  title: string;
}) {
  const [hits, setHits] = useState<HomepageHit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const normalizedCount = Math.max(1, count);

    async function fetchHits() {
      setLoading(true);
      const nextHits = await getHomepageHits(
        search,
        normalizedCount,
        includeMainCategories,
        randomizeCategorySlots,
        seed || 1,
      );

      if (mounted) {
        setHits(nextHits);
        setLoading(false);
      }
    }

    fetchHits().catch((err) => {
      console.error("Failed to fetch homepage search results", err);
      if (mounted) {
        setHits([]);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [search, seed, count, includeMainCategories, randomizeCategorySlots]);

  return (
    <section className="mb-12 mt-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h3 className="text-3xl font-medium">{title}</h3>
        {showShuffle ? (
          <button
            className="rounded bg-slate-900 px-4 py-2 font-mono text-sm uppercase text-white hover:bg-slate-700 disabled:opacity-50"
            disabled={loading}
            onClick={shuffle}
            type="button"
          >
            Shuffle
          </button>
        ) : null}
      </div>
      <div className={`grid ${gridSizeClassNames[size]}`}>
        {hits.map((hit) => (
          <SearchHitHomepage
            backgroundColor={colorForHit(hit, colorOptions)}
            hit={hit}
            key={hit.id || hit.slug}
            size={size}
          />
        ))}
      </div>
    </section>
  );
}

async function getHomepageHits(
  search: any,
  count: number,
  includeMainCategories: boolean,
  randomizeCategorySlots: boolean,
  seed: number,
) {
  const requiredTypes = getRequiredTypes(
    count,
    includeMainCategories,
    randomizeCategorySlots,
    seed,
  );

  if (requiredTypes.length === 0) {
    const response = await search.client.searchClient.search([
      {
        indexName: search.index,
        params: { query: "", hitsPerPage: count },
      },
    ]);

    return uniqueHits(response.results?.[0]?.hits || []).slice(0, count);
  }

  const categoryHitCounts = getCategoryHitCounts(
    count,
    requiredTypes.length,
    randomizeCategorySlots,
    seed,
  );
  const requests = requiredTypes.map((type) => ({
    indexName: search.index,
    params: { query: "", hitsPerPage: count, filters: `type:=${type}` },
  }));
  const response = await search.client.searchClient.search(requests);
  const categoryHits = requiredTypes.map((_, index) =>
    uniqueHits(response.results?.[index]?.hits || []),
  );
  const allocatedHits = categoryHits.flatMap((hits, index) =>
    hits.slice(0, categoryHitCounts[index] || 0),
  );
  const overflowHits = categoryHits.flatMap((hits, index) =>
    hits.slice(categoryHitCounts[index] || 0),
  );
  const hits = uniqueHits([
    ...allocatedHits,
    ...shuffleWithSeed(overflowHits, seed + count * 3001),
  ]).slice(0, count);

  return randomizeCategorySlots
    ? shuffleWithSeed(hits, seed + count * 1009)
    : hits;
}

function getRequiredTypes(
  count: number,
  includeMainCategories: boolean,
  randomizeCategorySlots: boolean,
  seed: number,
) {
  if (!includeMainCategories) return [];

  const types = randomizeCategorySlots
    ? shuffleWithSeed(mainTypes, seed + count * 2003)
    : mainTypes;

  return types.slice(0, Math.min(count, mainTypes.length));
}

function getCategoryHitCounts(
  count: number,
  categoryCount: number,
  randomizeCategorySlots: boolean,
  seed: number,
) {
  const baseCount = Math.floor(count / categoryCount);
  const remainder = count % categoryCount;
  const counts = Array.from({ length: categoryCount }, () => baseCount);
  const indexes = Array.from({ length: categoryCount }, (_, index) => index);
  const extraIndexes = randomizeCategorySlots
    ? shuffleWithSeed(indexes, seed + count * 4001)
    : indexes;

  for (const index of extraIndexes.slice(0, remainder)) {
    counts[index] = (counts[index] || 0) + 1;
  }

  return counts;
}

function uniqueHits(hits: HomepageHit[]) {
  const seen = new Set<string>();

  return hits.filter((hit) => {
    const key = hit.id || hit.slug;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shuffleWithSeed<T>(items: readonly T[], seed: number) {
  const shuffled = [...items];
  const random = seededRandom(seed);

  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index];
    const replacement = shuffled[randomIndex];

    if (current === undefined || replacement === undefined) continue;

    shuffled[index] = replacement;
    shuffled[randomIndex] = current;
  }

  return shuffled;
}

function seededRandom(seed: number) {
  let value = seed || 1;

  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function SearchHitHomepage({
  backgroundColor,
  hit,
  size,
}: {
  backgroundColor: ColorClassName;
  hit: HomepageHit;
  size: HomepageSearchSize;
}) {
  const url = `/${hit.slug}`;
  const result = hit._highlightResult as any;

  // const isOneInFourChance = Math.random() < 0.25 && (hit.__position + 1) % 4 === 0;
  const isOneInFourChance = false;

  return (
    <Box
      //
      link={url}
      small={size === "small"}
      className={isOneInFourChance ? "col-span-2 row-span-2" : ""}
      backgroundColor={backgroundColor}
      backgroundImage={hit.thumbnail}
      title={
        (
          <span
            dangerouslySetInnerHTML={{
              __html: result?.label?.value || hit.label,
            }}
          />
        ) as any
      }
      type={hit.type}
    />
  );
}

function colorForHit(
  hit: HomepageHit,
  { categoryColors, useCategoryColors }: HomepageSearchColorOptions,
) {
  const category = categoryKey(hit.type);

  if (useCategoryColors && category) {
    return categoryColors[category];
  }

  return colorClassNames[colorIndex(hit)] || defaultCategoryColors.object;
}

function categoryKey(type: string): CategoryColorKey | undefined {
  const value = type.toLowerCase();

  if (value === "manifest" || value === "manifests" || value === "objects") {
    return "object";
  }
  if (value === "exhibitions") return "exhibition";
  if (value === "collections") return "collection";
  if (value === "publications") return "publication";
  if (categoryColorKeys.includes(value as CategoryColorKey)) {
    return value as CategoryColorKey;
  }
}

function colorIndex(hit: HomepageHit) {
  const value = hit.id || hit.slug || hit.label;
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash + value.charCodeAt(i)) % colorClassNames.length;
  }
  return hash;
}

const colorSchema = z.enum(colorClassNames);

export const HomepageSearchBlock = block(
  {
    label: "Homepage search",
    props: z.object({
      title: z.string().optional(),
      count: z.number().int().min(1).max(24).optional(),
      includeMainCategories: z.boolean().optional(),
      useCategoryColors: z.boolean().optional(),
      objectColor: colorSchema.optional(),
      exhibitionColor: colorSchema.optional(),
      collectionColor: colorSchema.optional(),
      publicationColor: colorSchema.optional(),
      randomizeCategorySlots: z.boolean().optional(),
      showShuffle: z.boolean().optional(),
      size: z.enum(["small", "medium", "large"]).optional(),
    }),
  },
  HomepageSearch,
);
