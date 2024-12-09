import { BuildConfig } from '../build.ts';
import { join } from 'node:path';
import { mkdirp } from 'mkdirp';
import { ActiveResourceJson } from '../../util/store.ts';
import slug from 'slug';
import { existsSync } from 'fs';
import { Collection } from '@iiif/presentation-3';
import { dump } from 'js-yaml';
import { createCollection } from '../../util/create-collection.ts';
// import { macro } from "../../macro.ts" assert { type: "macro" };

export async function indices(
  {
    allResources,
    indexCollection,
    manifestCollection,
    storeCollections,
    siteMap,
    editable,
    overrides,
    collections,
  }: {
    allResources: Array<ActiveResourceJson>;
    indexCollection?: Record<string, any>;
    manifestCollection?: any[];
    storeCollections?: Record<string, Array<any>>;
    siteMap?: Record<string, { type: string; source: any; label?: string }>;
    editable?: Record<string, string>;
    overrides?: Record<string, string>;
    collections?: Record<string, string[]>;
  },
  { options, server, buildDir, config, cacheDir, topicsDir, collectionRewrites }: BuildConfig
) {
  if (options.exact || options.stores) {
    return;
  }

  const topLevelCollection: any[] = [];
  const configUrl = typeof server === 'string' ? server : server?.url;

  if (collections && indexCollection) {
    const collectionSlugs = Object.keys(collections);
    for (let originalCollectionSlug of collectionSlugs) {
      const manifestSlugs = collections[originalCollectionSlug];
      let collectionSlug = originalCollectionSlug; // @todo rewrite
      if (!collectionSlug.startsWith('collections/')) {
        collectionSlug = `collections/${collectionSlug}`;
      }

      for (const rewrite of collectionRewrites) {
        if (rewrite.rewrite) {
          const newSlug = await rewrite.rewrite(collectionSlug, {
            id: collectionSlug,
            type: 'Collection',
          });
          if (newSlug) {
            collectionSlug = newSlug;
          }
        }
      }

      if (!indexCollection[collectionSlug]) {
        const collectionSnippet = createCollection({
          configUrl,
          slug: collectionSlug,
          label: collectionSlug,
        });
        const collection = {
          ...collectionSnippet,
          items: manifestSlugs
            .map((slug) => {
              return indexCollection[slug];
            })
            .filter(Boolean),
        };

        (collectionSnippet as any)['hss:totalItems'] = collection['items'].length;
        await Bun.write(join(buildDir, collectionSlug, 'collection.json'), JSON.stringify(collection, null, 2));

        topLevelCollection.push(collectionSnippet);
      }
    }
  }

  const indexMap: Record<string, Record<string, string[]>> = {};
  for (const resource of allResources) {
    const indices = join(cacheDir, resource.slug, 'indices.json');
    const file = await Bun.file(indices).json();
    const subjectTypes = Object.keys(file);
    for (const subjectType of subjectTypes) {
      indexMap[subjectType] = indexMap[subjectType] || {};
      for (const subject of file[subjectType]) {
        indexMap[subjectType][subject] = indexMap[subjectType][subject] || [];
        // const indices = file[subjectType][subject];
        if (indexMap[subjectType][subject].includes(resource.slug)) {
          continue;
        }
        indexMap[subjectType][subject].push(resource.slug);
      }
    }
  }

  // Now build each collection in the index

  if (indexCollection) {
    const baseTopicTypeCollectionSnippet = createCollection({
      configUrl,
      slug: 'topics',
      label: 'Topics',
    });

    topLevelCollection.push(baseTopicTypeCollectionSnippet);
    const baseTopicTypeCollection: Collection = {
      ...baseTopicTypeCollectionSnippet,
      items: [],
    };
    const topicTypeKeys = Object.keys(indexMap);
    for (const topicTypeKey of topicTypeKeys) {
      const topicTypeId = slug(topicTypeKey);
      const topicType = indexMap[topicTypeKey];
      const topicKeys = Object.keys(topicType);

      let baseTopicTypeMeta = {};
      const topicTypeMetaDisk = join(topicsDir, topicTypeKey, `_meta.yaml`);
      if (existsSync(topicTypeMetaDisk)) {
        baseTopicTypeMeta = (await import(topicTypeMetaDisk)) || {};
      }
      const topicTypeMeta = Object.assign(
        {
          id: topicTypeId,
          label: topicTypeKey,
          slug: 'topics/' + topicTypeId,
        },
        baseTopicTypeMeta
      );

      const topicTypeCollectionSnippet = createCollection({
        configUrl,
        slug: topicTypeMeta.slug,
        label: topicTypeMeta.label,
      });

      indexCollection[topicTypeMeta.slug] = topicTypeCollectionSnippet;
      topLevelCollection.push(topicTypeCollectionSnippet);
      baseTopicTypeCollection.items.push(topicTypeCollectionSnippet);

      const topicTypeCollection: Collection = {
        ...topicTypeCollectionSnippet,
        items: [],
      };

      for (const topicKey of topicKeys) {
        const topic = topicType[topicKey];
        const topicId = slug(topicKey);
        const topicMetaDisk = join(topicsDir, topicTypeKey, `${topicId}.yaml`);
        let baseMeta = {};
        if (existsSync(topicMetaDisk)) {
          baseMeta = (await import(topicMetaDisk)) || {};
        }

        const topicMeta: any = Object.assign(
          {
            id: topicId,
            label: topicKey,
            slug: 'topics/' + topicTypeKey + '/' + topicId,
          },
          baseMeta
        );
        if (options.topics) {
          await mkdirp(join(topicsDir, topicTypeKey));
          await Bun.write(topicMetaDisk, dump(topicMeta));
        }

        const topicCollectionSnippet = createCollection({
          configUrl,
          slug: topicMeta.slug,
          label: topicMeta.label,
        });

        topicTypeCollection.items.push(topicCollectionSnippet);

        indexCollection[topicMeta.slug] = topicCollectionSnippet;

        if (topicMeta.thumbnail) {
          (topicCollectionSnippet as any).thumbnail = [
            {
              id: topicMeta.thumbnail,
              type: 'Image',
            },
          ];
        }

        const topicCollection: Collection = {
          ...topicCollectionSnippet,
          items: topic
            .map((slug: string) => {
              return indexCollection[slug];
            })
            .filter((e) => e),
        };

        await mkdirp(join(buildDir, 'topics', topicTypeKey, topicId));

        (topicCollection as any)['hss:totalItems'] = topicCollection['items'].length;
        (topicCollectionSnippet as any)['hss:totalItems'] = topicCollection['items'].length;
        await Bun.write(
          join(buildDir, 'topics', topicTypeKey, topicId, 'collection.json'),
          JSON.stringify(topicCollection, null, 2)
        );
        await Bun.write(
          join(buildDir, 'topics', topicTypeKey, topicId, 'meta.json'),
          JSON.stringify(topicMeta, null, 2)
        );
      }

      await mkdirp(join(buildDir, 'topics', topicTypeKey));
      await Bun.write(join(buildDir, 'topics', 'collection.json'), JSON.stringify(baseTopicTypeCollection, null, 2));
      (topicTypeCollection as any)['hss:totalItems'] = topicTypeCollection['items'].length;
      (topicTypeCollectionSnippet as any)['hss:totalItems'] = topicTypeCollection['items'].length;
      await Bun.write(
        join(buildDir, 'topics', topicTypeKey, 'collection.json'),
        JSON.stringify(topicTypeCollection, null, 2)
      );
      await Bun.write(join(buildDir, 'topics', topicTypeKey, 'meta.json'), JSON.stringify(topicTypeMeta, null, 2));
    }
  }

  await mkdirp(join(buildDir, 'meta'));

  await Bun.write(join(buildDir, 'meta', 'indices.json'), JSON.stringify(indexMap, null, 2));

  if (indexCollection) {
    const indexCollectionJson = createCollection({
      configUrl,
      slug: '',
      label: 'Index',
    }) as Collection;

    indexCollectionJson.items = Object.values(indexCollection);

    await Bun.write(join(buildDir, 'collection.json'), JSON.stringify(indexCollectionJson, null, 2));
  }

  if (manifestCollection) {
    const manifestCollectionJson = createCollection({
      configUrl,
      slug: 'manifests',
      label: 'Manifests',
    }) as Collection;

    manifestCollectionJson.items = manifestCollection;

    await Bun.write(join(buildDir, 'manifests', 'collection.json'), JSON.stringify(manifestCollectionJson, null, 2));
  }

  if (storeCollections) {
    await mkdirp(join(buildDir, 'stores'));
    const storeCollectionsJson = Object.entries(storeCollections).map(async ([storeId, items]) => {
      const storeCollectionSnippet = createCollection({
        configUrl,
        slug: `stores/${storeId}`,
        label: storeId,
      }) as Collection;

      topLevelCollection.push(storeCollectionSnippet);

      await mkdirp(join(buildDir, 'stores', storeId));

      return Bun.write(
        join(buildDir, 'stores', `${storeId}/collection.json`),
        JSON.stringify(
          {
            ...storeCollectionSnippet,
            items,
          },
          null,
          2
        )
      );
    });

    const topLevelCollectionJson = createCollection({
      configUrl,
      slug: 'collections',
      label: 'Collections',
    }) as Collection;
    topLevelCollectionJson.items = topLevelCollection;
    await mkdirp(join(buildDir, 'collections'));
    await Bun.write(join(buildDir, 'collections/collection.json'), JSON.stringify(topLevelCollectionJson, null, 2));

    await Promise.all(storeCollectionsJson);
  }

  // Standard files
  await mkdirp(join(buildDir, 'config'));
  await Bun.write(join(buildDir, 'config', 'slugs.json'), JSON.stringify(config.slugs || {}, null, 2));

  await Bun.write(join(buildDir, 'config', 'stores.json'), JSON.stringify(config.stores, null, 2));

  if (siteMap) {
    await Bun.write(join(buildDir, 'meta/sitemap.json'), JSON.stringify(siteMap, null, 2));
  }

  if (editable) {
    await Bun.write(join(buildDir, 'meta/editable.json'), JSON.stringify(editable, null, 2));
  }

  if (overrides) {
    await Bun.write(join(buildDir, 'meta/overrides.json'), JSON.stringify(overrides, null, 2));
  }

  // if (options.client || options.html) {
  //   const files = await macro();
  //   // // This needs to work with compile.
  //   if (options.client) {
  //     await Bun.write(join(buildDir, "client.js"), files.client);
  //   }
  //
  //   if (options.html) {
  //     await Bun.write(join(buildDir, "index.html"), files.indexProd);
  //     await Bun.write(join(buildDir, "explorer.html"), files.explorer);
  //     await Bun.write(join(buildDir, "clover.html"), files.clover);
  //   }
  // }

  //   const bundle = await Bun.build({
  //     entrypoints: ["./src/lib/client.ts"],
  //     sourcemap: "none",
  //     target: "browser",
  //     minify: true,
  //   });
  //   const script = bundle.outputs[0];
  //   const scriptPath = join(buildDir, "client.js");
  //   await Bun.write(scriptPath, script);
  // }
}
