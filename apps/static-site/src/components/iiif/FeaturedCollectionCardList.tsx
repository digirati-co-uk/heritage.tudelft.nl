import type { Collection } from "@iiif/presentation-3";
import { type CSSProperties, useMemo } from "react";
import { CollectionCard } from "./CollectionCard";
import { FeaturedCollectionCarousel } from "./FeaturedCollectionCarousel";

interface FeaturedCollectionCardListProps {
  background?: string;
  collections: Collection["items"];
}

export function FeaturedCollectionCardList({ background, collections: _collections }: FeaturedCollectionCardListProps) {
  const collections = useMemo(() => _collections.slice(0, 12), [_collections]);

  if (!collections.length) return null;

  return (
    <div className="mt-8 min-w-0" style={background ? ({ "--card-color": background } as CSSProperties) : {}}>
      <FeaturedCollectionCarousel>
        {collections.map((collection) => (
          <li key={collection.id} className="min-w-0 snap-start">
            <CollectionCard collection={collection} />
          </li>
        ))}
      </FeaturedCollectionCarousel>
    </div>
  );
}
