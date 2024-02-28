import { extract } from "iiif-hss";

extract(
  {
    id: "delft-collection-source",
    name: "Delft collection source",
    types: ["Collection"],
    invalidate: async () => {
      return true;
    },

    collect: async (temp, api) => {
      const collectionSources = join(api.build.filesDir, "meta", "collection-source.json");

      await writeFile(collectionSources, JSON.stringify(temp, null, 2));
    },
  },
  async (_, api) => {
    const collection = api.resource;
    const itemIds = [];
    for (const item of collection.items || []) {
      itemIds.push({ id: item.id, type: item.type });
    }

    return {
      temp: { itemIds, collectionId: collection.id, collectionLabel: collection.label },
    };
  }
);
