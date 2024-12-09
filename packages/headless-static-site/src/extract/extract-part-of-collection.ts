import { Extraction } from '../util/extract';

type TempExtraction = {
  type: 'Collection' | 'Manifest';
  idMapping: { id: string; slug: string; label?: any };
  collectionItems?: Record<string, string[]>;
};

export const extractPartOfCollection: Extraction<any, TempExtraction> = {
  id: 'extract-part-of-collection',
  name: 'Extract Collection',
  types: ['Collection', 'Manifest'],
  invalidate: async (resource, api, config) => {
    return true;
  },
  async handler(resource, api, config) {
    if (resource.type === 'Collection') {
      // Mapping of collection -> manifest
      const manifestIds = api.resource.items.map((item: any) => item.id);
      return {
        temp: {
          type: 'Collection',
          idMapping: { id: resource.id, slug: resource.slug, label: api.resource.label },
          collectionItems: {
            [resource.id]: manifestIds,
          },
        },
      };
    }

    if (resource.type === 'Manifest') {
      return {
        temp: {
          type: 'Manifest',
          idMapping: { id: resource.id, slug: resource.slug },
        },
      };
    }

    return {};
  },

  async collect(temp, api, config) {
    const items = Object.entries(temp);
    const manifestMapping: Record<string, string> = {};
    const manifestIsInCollection: Record<string, Array<{ id: string; slug: string; label?: any }>> = {};

    for (const [slug, mapping] of items) {
      if (mapping.type === 'Manifest') {
        // Create a mapping of manifest.id -> slug
        manifestMapping[mapping.idMapping.id] = slug;
      }
    }

    for (const [slug, mapping] of items) {
      if (mapping.type === 'Collection') {
        // Create a mapping of collection.id -> manifest.ids
        const collectionItems = mapping.collectionItems || {};
        for (let [collectionId, manifestIds] of Object.entries(collectionItems)) {
          if (collectionId.startsWith('virtual://')) {
            collectionId = api.build.makeId({ type: 'Collection', slug });
          }
          for (const manifestId of manifestIds) {
            const manifestSlug = manifestMapping[manifestId];
            manifestIsInCollection[manifestSlug] = manifestIsInCollection[manifestSlug] || [];
            manifestIsInCollection[manifestSlug].push({
              id: collectionId,
              slug: slug,
              label: mapping.idMapping.label,
            });
          }
        }
      }
    }

    return {
      temp: manifestIsInCollection,
    };
  },

  async injectManifest(resource, temp, api, config) {
    if (temp.length === 0) {
      return {};
    }

    return {
      meta: {
        partOfCollections: temp,
      },
    };
  },
};
