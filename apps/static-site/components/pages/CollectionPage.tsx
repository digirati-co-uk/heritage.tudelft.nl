import { Collection } from "@iiif/presentation-3";
import { AutoLanguage } from "@/components/pages/AutoLanguage";
import { Box } from "@/components/blocks/Box";

export interface CollectionPageProps {
  collection: Collection;
  meta: {};
}

export function CollectionPage(props: CollectionPageProps) {
  return (
    <div>
      <div className="lg:grid-cols-3 grid-cols-1 grid">
        <div className="col-span-1">
          <div>
            <h1>
              <AutoLanguage>{props.collection.label}</AutoLanguage>
            </h1>
          </div>
        </div>

        <div className={`col-span-2 grid gap-4 lg:grid-cols-2 grid-cols-1`}>
          {props.collection.items.map((manifest) => {
            const id = (manifest.id.split("/iiif/").pop() || "").replace(
              "/manifest.json",
              "",
            );
            let thumbnail = (manifest.thumbnail || [])[0]?.id;
            if (thumbnail) {
              thumbnail.replace("/200,/", "/400,/");
            }
            return (
              <Box
                title={(<AutoLanguage>{manifest.label}</AutoLanguage>) as any}
                type={manifest.type}
                link={`/${id}`}
                backgroundImage={thumbnail}
                unfiltered
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
