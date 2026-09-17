import type { Collection } from "@iiif/presentation-3";
import { useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { AutoLanguage } from "../pages/AutoLanguage";

export function CollectionListingBox({
  className,
  background,
  collection,
}: { className?: string; background?: string; collection: Collection }) {
  const collectionItems = useMemo(() => {
    return collection.items.filter((t) => t.type === "Collection");
  }, [collection.items]);

  if (!collectionItems.length) return null;

  return (
    <div
      className={twMerge("bg-[var(--card-color)] text-black cut-corners w-full p-6", className)}
      style={background ? ({ "--card-color": background } as any) : undefined}
    >
      <h3 className="text-xl uppercase font-bold">
        <AutoLanguage>{collection.label}</AutoLanguage>:
      </h3>
      <ul className="text-xl list-disc font-bold underline ms-6">
        {collectionItems.map((item, index) => {
          const slug = item["hss:slug"].replace(/collections\//g, "");
          return (
            <li key={index} className="ps-1">
              <a href={`#${slug}`}>
                <AutoLanguage>{item.label}</AutoLanguage>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
