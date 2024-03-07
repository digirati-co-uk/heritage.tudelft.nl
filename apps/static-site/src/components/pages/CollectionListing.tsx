import { renderCollectionLabel } from "@/helpers/collection-label";
import { loadCollection } from "@/iiif";
import { Box } from "../blocks/Box";
import { AutoLanguage } from "./AutoLanguage";
import siteCollections from "@repo/iiif/build/collections/site/collection.json";
import allCollections from "@repo/iiif/build/collections/collection.json";

export async function CollectionListing() {
  const fallbackBg = "bg-cyan-500 group-hover:bg-cyan-600 transition-background duration-500 ease-in-out";

  return (
    <>
      <h2 className="my-5 text-2xl font-bold">Curated collections</h2>

      <div className="mb-8 grid-cols-1 gap-0.5 md:grid md:grid-cols-4">
        {siteCollections.items.map((collection) => {
          const id = (collection.id.split("/iiif/").pop() || "").replace("/manifest.json", "");
          const thumbnail = (collection.thumbnail || [])[0];

          return (
            <Box
              key={id}
              link={(collection as any)["hss:slug"]}
              title={
                (<AutoLanguage mapString={renderCollectionLabel}>{collection.label}</AutoLanguage>) as any as string
              }
              fallbackBackgroundColor={fallbackBg}
              type="collection"
              backgroundColor={thumbnail ? "bg-indigo-500" : undefined}
              unfiltered={!thumbnail}
              small
              dark={!thumbnail}
              backgroundImage={thumbnail?.id}
            />
          );
        })}
      </div>

      <h2 className="my-5 text-2xl font-bold">All Collections</h2>

      <div className="mb-8 grid-cols-1 gap-0.5 md:grid md:grid-cols-4">
        {allCollections.items.map((collection) => {
          const id = (collection.id.split("/iiif/").pop() || "").replace("/manifest.json", "");
          const slug = (collection as any)["hss:slug"];
          if (!slug.startsWith("collections/")) return null;
          const thumbnail = ((collection as any).thumbnail || [])[0];

          return (
            <Box
              key={id}
              link={slug}
              title={
                (<AutoLanguage mapString={renderCollectionLabel}>{collection.label}</AutoLanguage>) as any as string
              }
              fallbackBackgroundColor={fallbackBg}
              type="collection"
              backgroundColor={thumbnail ? "bg-cyan-500" : undefined}
              unfiltered={!thumbnail}
              small
              dark={!thumbnail}
              backgroundImage={thumbnail?.id}
            />
          );
        })}
      </div>
    </>
  );
}
