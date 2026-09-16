import { Link, getObjectSlug } from "@/i18n/navigation";
import { getValue } from "@iiif/helpers";
import type { Collection } from "@iiif/presentation-3";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { AutoLanguage } from "../pages/AutoLanguage";
import { FeaturedCollectionCarousel } from "./FeaturedCollectionCarousel";

interface FeaturedCollectionCardListProps {
  background?: string;
  collections: Collection["items"];
}

export function FeaturedCollectionCardList({ background = "#F3CE49", collections }: FeaturedCollectionCardListProps) {
  const t = useTranslations();

  if (!collections.length) return null;

  return (
    <div className="mt-8 min-w-0" style={{ "--card-color": background } as CSSProperties}>
      <FeaturedCollectionCarousel>
        {collections.map((collection) => {
          const summary =
            collection.metadata?.find((item) => item.label.en?.includes("Short description"))?.value ??
            collection.summary;
          const thumbnail = collection.thumbnail?.[0];
          const service = thumbnail && "service" in thumbnail ? thumbnail.service?.[0] : undefined;
          const serviceId = service && ("id" in service ? service.id : service["@id"]);
          // Level-0 thumbnails only support predefined sizes; their supplied URL is already usable.
          const src =
            typeof serviceId === "string" && service?.profile !== "level0"
              ? `${serviceId.replace(/\/$/, "")}/full/!800,800/0/default.jpg`
              : thumbnail?.id;

          return (
            <li key={collection.id} className="min-w-0 snap-start">
              <Link
                href={`/${getObjectSlug(collection["hss:slug"])}`}
                aria-label={getValue(collection.label)}
                className="cut-corners group flex h-full flex-col bg-[var(--card-color)] text-black focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-black"
              >
                <div className="cut-corners relative aspect-square w-full shrink-0 bg-zinc-300">
                  {src ? (
                    <img
                      src={src}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover group-hover:scale-110 scale-100 transition-transform duration-1000"
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col break-words p-4 pb-6 sm:p-5 sm:pb-6">
                  <h3 className="text-2xl font-bold leading-tight underline-offset-4 group-hover:underline group-focus-visible:underline lg:text-3xl">
                    <AutoLanguage>{collection.label}</AutoLanguage>
                  </h3>
                  {summary ? (
                    <p className="mt-2 text-lg leading-snug lg:text-xl">
                      <AutoLanguage>{summary}</AutoLanguage>
                    </p>
                  ) : null}
                  {collection["hss:totalItems"] !== undefined ? (
                    <p className="mt-auto pt-8 text-lg leading-snug lg:text-xl">
                      {t("Objects in collection", { count: collection["hss:totalItems"] })}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </FeaturedCollectionCarousel>
    </div>
  );
}
