import fs from "node:fs";
import { join } from "node:path";
import type { Collection } from "@iiif/presentation-3";
import slug from "slug";
import { stringify } from "yaml";
import { createCollection } from "../../util/create-collection.ts";
import { loadJson } from "../../util/load-json.ts";
import type { ActiveResourceJson } from "../../util/store.ts";
import type { BuildConfig } from "../build.ts";
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
  { options, server, buildDir, config, cacheDir, topicsDir, collectionRewrites, files }: BuildConfig
) {
  if (options.exact || options.stores) {
    return;
  }

  // File helpers.
  function write(file: string, content: any) {
    return files.writeFile(file, content);
  }
  function writeJson(file: string, content: any) {
    return files.saveJson(file, content);
  }
  async function readJson(path: string) {
    return await files.loadJson(path);
  }

  const topLevelCollection: any[] = [];
  const configUrl = typeof server === "string" ? server : server?.url;

  if (collections && indexCollection) {
    const collectionSlugs = Object.keys(collections);
    for (const originalCollectionSlug of collectionSlugs) {
      const manifestSlugs = collections[originalCollectionSlug];
      let collectionSlug = originalCollectionSlug; // @todo rewrite
      if (!collectionSlug.startsWith("collections/")) {
        collectionSlug = `collections/${collectionSlug}`;
      }

      for (const rewrite of collectionRewrites) {
        if (rewrite.rewrite) {
          const newSlug = await rewrite.rewrite(collectionSlug, {
            id: collectionSlug,
            type: "Collection",
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

        (collectionSnippet as any)["hss:totalItems"] = collection.items.length;
        await files.mkdir(join(buildDir, collectionSlug));
        await writeJson(join(buildDir, collectionSlug, "collection.json"), collection);

        topLevelCollection.push(collectionSnippet);
      }
    }
  }

  const indexMap: Record<string, Record<string, string[]>> = {};
  for (const resource of allResources) {
    const indices = join(cacheDir, resource.slug, "indices.json");
    const file = await readJson(indices);
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
      label: "Topics",
      ...(config.collections?.topics || {}),
      configUrl,
      slug: "topics",
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
      const topicTypeMetaDisk = join(topicsDir, topicTypeKey, "_meta.yaml");
      if (fs.existsSync(topicTypeMetaDisk)) {
        baseTopicTypeMeta = files.readYaml(topicTypeMetaDisk) || {};
      }
      const topicTypeMeta = Object.assign(
        {
          id: topicTypeId,
          label: topicTypeKey,
          slug: `topics/${topicTypeId}`,
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
      baseTopicTypeCollection.items.push(topicTypeCollectionSnippet as any);

      const topicTypeCollection: Collection = {
        ...topicTypeCollectionSnippet,
        items: [],
      };

      for (const topicKey of topicKeys) {
        const topic = topicType[topicKey];
        const topicId = slug(topicKey);
        const topicMetaDisk = join(topicsDir, topicTypeKey, `${topicId}.yaml`);
        let baseMeta = {};
        if (fs.existsSync(topicMetaDisk)) {
          baseMeta = files.readYaml(topicMetaDisk) || {};
        }

        const topicMeta: any = Object.assign(
          {
            id: topicId,
            label: topicKey,
            slug: `topics/${topicTypeKey}/${topicId}`,
          },
          baseMeta
        );
        if (options.topics) {
          await fs.promises.mkdir(join(topicsDir, topicTypeKey), { recursive: true });
          await write(topicMetaDisk, stringify(topicMeta));
        }

        const topicCollectionSnippet = createCollection({
          configUrl,
          slug: topicMeta.slug,
          label: topicMeta.label,
        });

        topicTypeCollection.items.push(topicCollectionSnippet as any);

        indexCollection[topicMeta.slug] = topicCollectionSnippet;

        if (topicMeta.thumbnail) {
          (topicCollectionSnippet as any).thumbnail = [
            {
              id: topicMeta.thumbnail,
              type: "Image",
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

        await files.mkdir(join(buildDir, "topics", topicTypeKey, topicId));

        (topicCollection as any)["hss:totalItems"] = topicCollection.items.length;
        (topicCollectionSnippet as any)["hss:totalItems"] = topicCollection.items.length;
        await writeJson(join(buildDir, "topics", topicTypeKey, topicId, "collection.json"), topicCollection);
        await writeJson(join(buildDir, "topics", topicTypeKey, topicId, "meta.json"), topicMeta);
      }

      await files.mkdir(join(buildDir, "topics", topicTypeKey));
      await writeJson(join(buildDir, "topics", "collection.json"), baseTopicTypeCollection);
      (topicTypeCollection as any)["hss:totalItems"] = topicTypeCollection.items.length;
      (topicTypeCollectionSnippet as any)["hss:totalItems"] = topicTypeCollection.items.length;
      await writeJson(join(buildDir, "topics", topicTypeKey, "collection.json"), topicTypeCollection);
      await writeJson(join(buildDir, "topics", topicTypeKey, "meta.json"), topicTypeMeta);
    }
  }

  await files.mkdir(join(buildDir, "meta"));

  await writeJson(join(buildDir, "meta", "indices.json"), indexMap);

  if (indexCollection) {
    const indexCollectionJson = createCollection({
      label: "Index",
      ...(config.collections?.index || {}),
      configUrl,
      slug: "",
    }) as Collection;

    indexCollectionJson.items = Object.values(indexCollection);

    await writeJson(join(buildDir, "collection.json"), indexCollectionJson);
  }

  if (manifestCollection) {
    const manifestCollectionJson = createCollection({
      label: "Manifests",
      ...(config.collections?.index || {}),
      configUrl,
      slug: "manifests",
    }) as Collection;

    manifestCollectionJson.items = manifestCollection;

    await writeJson(join(buildDir, "manifests", "collection.json"), manifestCollectionJson);
  }

  if (storeCollections) {
    await files.mkdir(join(buildDir, "stores"));
    const storeCollectionsJson = Object.entries(storeCollections).map(async ([storeId, items]) => {
      const storeCollectionSnippet = createCollection({
        configUrl,
        slug: `stores/${storeId}`,
        label: storeId,
      }) as Collection;

      topLevelCollection.push(storeCollectionSnippet);

      await files.mkdir(join(buildDir, "stores", storeId));

      return writeJson(join(buildDir, "stores", `${storeId}/collection.json`), {
        ...storeCollectionSnippet,
        items,
      });
    });

    const topLevelCollectionJson = createCollection({
      label: "Collections",
      ...(config.collections?.collections || {}),
      slug: "collections",
      configUrl,
    }) as Collection;
    topLevelCollectionJson.items = topLevelCollection;
    await files.mkdir(join(buildDir, "collections"));
    await writeJson(join(buildDir, "collections/collection.json"), topLevelCollectionJson);

    await Promise.all(storeCollectionsJson);
  }

  // Standard files
  await files.mkdir(join(buildDir, "config"));
  await writeJson(join(buildDir, "config", "slugs.json"), config.slugs || {});

  await writeJson(join(buildDir, "config", "stores.json"), config.stores);

  if (siteMap) {
    await writeJson(join(buildDir, "meta/sitemap.json"), siteMap);
  }

  if (editable) {
    await writeJson(join(buildDir, "meta/editable.json"), editable);
  }

  if (overrides) {
    await writeJson(join(buildDir, "meta/overrides.json"), overrides);
  }

  // if (options.client || options.html) {
  //   const files = await macro();
  //   // // This needs to work with compile.
  //   if (options.client) {
  //     await write(join(buildDir, "client.js"), files.client);
  //   }
  //
  //   if (options.html) {
  //     await write(join(buildDir, "index.html"), files.indexProd);
  //     await write(join(buildDir, "explorer.html"), files.explorer);
  //     await write(join(buildDir, "clover.html"), files.clover);
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
  //   await write(scriptPath, script);
  // }
}
