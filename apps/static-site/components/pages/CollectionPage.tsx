import { Collection } from "@iiif/presentation-3";
import { AutoLanguage } from "@/components/pages/AutoLanguage";
import { Link } from "@/navigation";
import { ManifestSearch } from "../search/ManifestSearch";

export interface CollectionPageProps {
  slug: string;
  collection: Collection;
  meta: {};
}

function renderCollectionLabel(text: string) {
  const newText = text.replace("collections/", "");

  // replace - with space
  return newText.replace(/-/g, " ");
}

export function CollectionPage(props: CollectionPageProps) {
  return (
    <div className="py-8">
      <div className="grid-cols-1 gap-8 md:grid md:grid-cols-3">
        <div className="col-span-1">
          <div className="cut-corners mb-8 flex w-full flex-col justify-between bg-cyan-500 p-4 md:aspect-square">
            <div className="text-center font-mono text-sm uppercase">Collection</div>
            <div className="flex flex-col items-center justify-center gap-4">
              <h1 className="text-center text-3xl font-bold">
                <AutoLanguage mapString={renderCollectionLabel}>{props.collection.label}</AutoLanguage>
              </h1>
              <div className="github-link-wrapper">
                <a className="font-mono text-xs underline underline-offset-4" href="#">
                  View source on GitHub
                </a>
              </div>
              <div className="iiif-link-wrapper">
                <a href={`${props.collection.id}`} target="_blank" title="Drag and Drop IIIF Resource"></a>
              </div>
            </div>
            <div />
          </div>

          <div className="p-4">
            <ManifestSearch collectionSlug={props.slug} />
          </div>
        </div>
        <div className={`col-span-2`}>
          <div id="search-results"></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {props.collection.items.map((manifest) => {
              const id = (manifest.id.split("/iiif/").pop() || "").replace("/manifest.json", "");

              let thumbnail = (manifest.thumbnail || [])[0]?.id;
              if (thumbnail) {
                thumbnail.replace("/200,/", "/400,/");
              }
              return (
                <div key={id} className="mb-4">
                  <div className="group">
                    <div className="cut-corners aspect-square">
                      <Link href={`/${id}`}>
                        <img
                          src={thumbnail}
                          alt=""
                          className="h-full w-full cursor-pointer object-cover transition-transform duration-1000 group-hover:scale-110"
                        />
                      </Link>
                    </div>
                    <h4 className="p-4 font-mono text-sm underline-offset-2 group-hover:underline">
                      <Link href={`/${id}`}>
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
