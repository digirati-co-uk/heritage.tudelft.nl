import type { Extraction } from "../util/extract.ts";

type ResourceRef = {
  id: string;
  type?: string;
};

type TempManifest = {
  type: "Manifest";
  id: string;
  thumbnail?: any;
};

type TempCollection = {
  type: "Collection";
  id: string;
  slug: string;
  thumbnail?: any;
  items: ResourceRef[];
};

type TempExtraction = TempManifest | TempCollection;

type TempInject = Record<string, { thumbnail: any }>;

function getThumbnail(value: any) {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return undefined;
    }
    return value[0];
  }

  return value;
}

function hasThumbnail(value: any) {
  if (!value) {
    return false;
  }
  if (typeof value === "string") {
    return value.length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return Boolean(value.id || value["@id"]);
}

function getMetaThumbnail(
  thumbnail:
    | undefined
    | {
        id: string;
        type: "fixed";
        width: number;
        height: number;
      }
) {
  if (thumbnail?.type === "fixed") {
    return { id: thumbnail.id, type: "Image", width: thumbnail.width, height: thumbnail.height };
  }
  return undefined;
}

export const extractCollectionThumbnail: Extraction<any, TempExtraction, TempInject> = {
  id: "extract-collection-thumbnail",
  name: "Extract Collection Thumbnail",
  types: ["Manifest", "Collection"],
  invalidate: async () => true,
  async handler(resource, api) {
    if (!resource.id) {
      return {};
    }

    if (resource.type === "Manifest") {
      const meta = await api.meta.value;
      const thumbnail = getThumbnail(api.resource.thumbnail) || getMetaThumbnail(meta.thumbnail);
      return {
        temp: {
          type: "Manifest",
          id: resource.id,
          thumbnail,
        },
      };
    }

    if (resource.type === "Collection") {
      const items = Array.isArray(api.resource.items)
        ? api.resource.items
            .map((item: any) => ({
              id: item?.id,
              type: item?.type,
            }))
            .filter((item: ResourceRef) => Boolean(item.id))
        : [];

      return {
        temp: {
          type: "Collection",
          id: resource.id,
          slug: resource.slug,
          thumbnail: getThumbnail(api.resource.thumbnail),
          items,
        },
      };
    }

    return {};
  },

  async collect(temp, api) {
    const manifestThumbnails: Record<string, any> = {};
    const collectionsById: Record<string, TempCollection> = {};
    const collectionsBySlug: Record<string, TempCollection> = {};

    const registerCollection = (id: string, collection: TempCollection) => {
      if (!id) {
        return;
      }
      collectionsById[id] = collection;
    };

    for (const entry of Object.values(temp) as TempExtraction[]) {
      if (entry.type === "Manifest") {
        if (entry.id && hasThumbnail(entry.thumbnail)) {
          manifestThumbnails[entry.id] = entry.thumbnail;
        }
        continue;
      }

      const collectionId = entry.id.startsWith("virtual://")
        ? api.build.makeId({ type: "Collection", slug: entry.slug })
        : entry.id;
      const collection = {
        ...entry,
        id: collectionId,
      };

      collectionsBySlug[collection.slug] = collection;
      registerCollection(entry.id, collection);
      registerCollection(collectionId, collection);
    }

    const getCollectionThumbnail = (collectionId: string, seen = new Set<string>()): any => {
      const collection = collectionsById[collectionId];
      if (!collection || seen.has(collection.slug)) {
        return null;
      }

      if (hasThumbnail(collection.thumbnail)) {
        return collection.thumbnail;
      }

      seen.add(collection.slug);
      for (const item of collection.items) {
        if (hasThumbnail(manifestThumbnails[item.id])) {
          return manifestThumbnails[item.id];
        }
        const nestedThumbnail = getCollectionThumbnail(item.id, seen);
        if (hasThumbnail(nestedThumbnail)) {
          return nestedThumbnail;
        }
      }
      seen.delete(collection.slug);

      return null;
    };

    const thumbnailsBySlug: TempInject = {};
    for (const collection of Object.values(collectionsBySlug)) {
      if (hasThumbnail(collection.thumbnail)) {
        continue;
      }
      const derivedThumbnail = getCollectionThumbnail(collection.id);
      if (hasThumbnail(derivedThumbnail)) {
        thumbnailsBySlug[collection.slug] = {
          thumbnail: derivedThumbnail,
        };
      }
    }

    if (!Object.keys(thumbnailsBySlug).length) {
      return undefined;
    }

    return {
      temp: thumbnailsBySlug,
    };
  },

  async injectManifest(resource, temp) {
    if (resource.type !== "Collection") {
      return {};
    }
    if (!hasThumbnail(temp.thumbnail)) {
      return {};
    }

    return {
      meta: {
        thumbnail: temp.thumbnail,
      },
    };
  },
};
