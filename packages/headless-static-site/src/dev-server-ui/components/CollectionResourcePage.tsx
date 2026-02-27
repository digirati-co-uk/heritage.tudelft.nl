import { CollectionItemCard } from "./CollectionItemCard";
import { JsonPanel } from "./JsonPanel";
import { ResourceSummaryCard } from "./ResourceSummaryCard";
import type { ResourceResponse } from "./types";
import { getCollectionItems } from "./utils";

export function CollectionResourcePage({
  debugBase,
  data,
  thumb,
}: {
  debugBase: string;
  data: ResourceResponse;
  thumb: string | null;
}) {
  const collectionItems = getCollectionItems(data.resource);

  return (
    <main>
      <ResourceSummaryCard data={data} thumb={thumb} />
      <section>
        {collectionItems.length ? (
          <div className="bg-white border border-gray-200 rounded-xl mb-3 p-3">
            <h3 className="font-semibold mb-3">Collection Items</h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
              {collectionItems.map((item) => (
                <CollectionItemCard
                  key={`${item.slug}-${item.id || ""}`}
                  debugBase={debugBase}
                  item={item}
                />
              ))}
            </div>
          </div>
        ) : null}
        <JsonPanel
          title="IIIF Resource"
          value={data.resource}
          href={data.links.files.resource}
        />
        <JsonPanel
          title="meta.json"
          value={data.meta}
          href={data.links.files.meta}
        />
        <JsonPanel
          title="indices.json"
          value={data.indices}
          href={data.links.files.indices}
        />
        <JsonPanel
          title="search-record.json"
          value={data.searchRecord}
          href={data.links.files.searchRecord}
        />
      </section>
    </main>
  );
}
