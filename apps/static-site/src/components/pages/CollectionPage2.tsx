import { Link } from "@/i18n/navigation";
import type { Collection } from "@iiif/presentation-3";
import { getTranslations } from "next-intl/server";
import { useMemo } from "react";
import { CollectionListingBox } from "../iiif/CollectionListingBox";
import { FeaturedCollectionCardList } from "../iiif/FeaturedCollectionCardList";
import { SharingAndViewingLinks } from "../iiif/SharingAndViewingLinks";
import { SharingOptions } from "../iiif/SharingOptions";
import { AutoLanguage } from "./AutoLanguage";

export async function CollectionPage2(props: { collection: Collection; meta: any; slug: string }) {
  const t = await getTranslations();
  const { collection, meta, slug } = props;

  const featuredCollections = collection.items.filter((item) => {
    return item.type === "Collection" && item.items.length && item.items[0]?.type === "Collection";
  });

  const otherCollections = collection.items.filter((item) => {
    return item.type === "Collection" && (!item.items.length || item.items[0]?.type !== "Collection");
  });

  const manifests = collection.items.filter((item) => {
    return item.type === "Manifest";
  });

  return (
    <div>
      <div className="md:flex md:flex-row mb-8 gap-6">
        <div className="flex-1">
          <h1 className="text-5xl mb-8">
            <AutoLanguage>{collection.label}</AutoLanguage>
          </h1>
          <p className="text-xl">
            <AutoLanguage html>{collection.summary}</AutoLanguage>
          </p>
        </div>
        <div className="w-full max-w-sm">
          <CollectionListingBox collection={collection} />
          <SharingAndViewingLinks
            sharingOptionsOpen={false}
            resource={{
              id: props.collection.id,
              type: "collection",
            }}
            content={{
              sharingViewers: t("Sharing"),
              showMore: t("Show more"),
              showLess: t("Show less"),
              currentPage: t("Permalink"),
              copiedMessage: t("Copied"),
              iiifLabel: t("IIIF Collection"),
            }}
          />
        </div>
      </div>

      {featuredCollections.length > 0 && (
        <div>
          {(featuredCollections as any).map((c: Collection) => (
            <div key={c.id}>
              <Link className="block text-3xl mb-4 hover:underline" href={`/${c["hss:slug"]}`}>
                <AutoLanguage>{c.label}</AutoLanguage>
              </Link>

              <p className="text-xl mb-4">
                <AutoLanguage html>{c.summary}</AutoLanguage>
              </p>
              <FeaturedCollectionCardList collections={c.items.filter((t) => t.type === "Collection")} />
            </div>
          ))}
        </div>
      )}

      {otherCollections.length > 0 && (
        <div>
          <h2 className="text-3xl mb-4">{t("Other Collections")}</h2>
          <div>
            {otherCollections.map((c) => (
              <Link className="block text-3xl mb-4 hover:underline" href={`/${c["hss:slug"]}`}>
                <AutoLanguage>{c.label}</AutoLanguage>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
