import { AutoLanguage } from "@/components/pages/AutoLanguage";
import { renderCollectionLabel } from "@/helpers/collection-label";
import { Link, getObjectSlug } from "@/navigation";
import type { Collection } from "@iiif/presentation-3";
import { getTranslations } from "next-intl/server";
import { CollectionMetadata } from "../iiif/CollectionMetadata";
import { SharingAndViewingLinks, type SharingAndViewingLinksContent } from "../iiif/SharingAndViewingLinks";
import { ManifestSearch } from "../search/ManifestSearch";
import { IIIFLogo } from "../iiif/IIIFLogo";

export interface CollectionPageProps {
  slug: string;
  collection: Collection;
  meta: {};
}

// @todo this is a bug with HSS not providing a slug on all collections. This can be removed once fixed.
function getSlugFromId(id: string) {
  if (id.includes("/collections/")) {
    const parts = id.split("/collections/")[1];
    return `collections/${parts?.replace("/collection.json", "")}`;
  }
  if (id.includes("/manifests/")) {
    const parts = id.split("/manifests/")[1];
    return `objects/${parts?.replace("/manifest.json", "")}`;
  }

  // http://localhost:3000/en/collections/delta/manifest.json

  return "#";
}

export async function CollectionPage(props: CollectionPageProps) {
  const t = await getTranslations();

  return (
    <div className="grid-cols-1 gap-8 md:grid md:grid-cols-3">
      <div className="col-span-1">
        <div className="cut-corners flex w-full flex-col justify-between bg-cyan-500 p-4 md:aspect-square">
          <div className="text-center font-mono text-sm uppercase">{t("Collection")}</div>
          <div className="flex flex-col items-center justify-center gap-4">
            <h1 className="text-center text-3xl font-medium">
              <AutoLanguage mapString={renderCollectionLabel}>{props.collection.label}</AutoLanguage>
            </h1>
            <div>
              <a
                className="opacity-40 hover:opacity-100"
                href={`${props.collection.id}`}
                target="_blank"
                title={t("Drag and Drop IIIF Resource")}
                rel="noreferrer"
              >
                <IIIFLogo className="text-2xl" title={"IIIF Collection Link"} />
                <span className="sr-only">IIIF Collection Link</span>
              </a>
            </div>
          </div>
          <div />
        </div>
        <div suppressHydrationWarning>
          {props.collection.metadata || props.collection.summary ? (
            <CollectionMetadata
              content={{
                summary: t("Summary"),
                readMore: t("Read more"),
              }}
              label={props.collection.label}
              summary={props.collection.summary}
              metadata={props.collection.metadata}
            />
          ) : null}
        </div>
        <SharingAndViewingLinks
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

        <div className="p-4">
          <ManifestSearch
            collectionSlug={props.slug}
            content={{
              allItems: t("All items"),
              searchBoxPlaceholder: t("Search collection"),
              searchResults: t("Search results"),
              noResultsFound: t("No results found"),
            }}
          />
        </div>
      </div>
      <div className="col-span-2">
        <div id="search-results" />
        <div className="b=9 grid grid-cols-1 gap-4 md:grid-cols-2">
          {props.collection.items.map((manifest) => {
            // @todo fix the bug in hss.
            const slug = getObjectSlug(manifest["hss:slug"] || getSlugFromId(manifest.id));
            let thumbnail = (manifest.thumbnail || [])[0]?.id;

            if (thumbnail) {
              // Todo: check for devicePixelRatio
              thumbnail = thumbnail.replace(/\/full\/.*?\//, "/full/!400,400/");
            }

            return (
              <div key={slug} className="mb-4">
                <div className="group">
                  <div className="cut-corners aspect-square bg-gray-400">
                    <Link href={`/${slug}`}>
                      <img
                        src={thumbnail}
                        alt=""
                        className="h-full w-full cursor-pointer object-contain transition-transform duration-1000 group-hover:scale-110"
                      />
                    </Link>
                  </div>
                  <h4 className="p-4 font-mono text-sm underline-offset-2 group-hover:underline">
                    <Link href={`/${slug}`}>
                      <AutoLanguage>{manifest.label}</AutoLanguage>
                    </Link>
                  </h4>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
