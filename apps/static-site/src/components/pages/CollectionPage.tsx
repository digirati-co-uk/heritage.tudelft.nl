import { Collection } from "@iiif/presentation-3";
import { AutoLanguage } from "@/components/pages/AutoLanguage";
import { Link, getObjectSlug } from "@/navigation";
import { ManifestSearch } from "../search/ManifestSearch";
import { renderCollectionLabel } from "@/helpers/collection-label";
import { getTranslations } from "next-intl/server";
import { CollectionMetadata } from "../iiif/CollectionMetadata";

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

  console.log(props.collection);

  return (
    <div className="py-8">
      <div className="grid-cols-1 gap-8 md:grid md:grid-cols-3">
        <div className="col-span-1">
          <div className="cut-corners mb-8 flex w-full flex-col justify-between bg-cyan-500 p-4 md:aspect-square">
            <div className="text-center font-mono text-sm uppercase">{t("Collection")}</div>
            <div className="flex flex-col items-center justify-center gap-4">
              <h1 className="text-center text-3xl font-bold">
                <AutoLanguage mapString={renderCollectionLabel}>{props.collection.label}</AutoLanguage>
              </h1>
              <div className="iiif-link-wrapper">
                <a href={`${props.collection.id}`} target="_blank" title={t("Drag and Drop IIIF Resource")}></a>
              </div>
            </div>
            <div />
          </div>
          <div>
            {props.collection.metadata || props.collection.summary ? (
              <CollectionMetadata
                content={{
                  summary: t("Summary"),
                  readMore: t("Read more"),
                }}
                summary={props.collection.summary}
                metadata={props.collection.metadata}
              />
            ) : null}
          </div>

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
        <div className={`col-span-2`}>
          <div id="search-results"></div>
          <div className="b=9 grid grid-cols-1 gap-4 md:grid-cols-2">
            {props.collection.items.map((manifest) => {
              // @todo fix the bug in hss.
              const slug = getObjectSlug(manifest["hss:slug"] || getSlugFromId(manifest.id));

              let thumbnail = (manifest.thumbnail || [])[0]?.id;
              if (thumbnail) {
                thumbnail.replace("/200,/", "/400,/");
              }
              return (
                <div key={slug} className="mb-4">
                  <div className="group">
                    <div className="cut-corners aspect-square bg-cyan-500">
                      <Link href={`/${slug}`}>
                        <img
                          src={thumbnail}
                          alt=""
                          className="h-full w-full cursor-pointer object-cover transition-transform duration-1000 group-hover:scale-110"
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
    </div>
  );
}
