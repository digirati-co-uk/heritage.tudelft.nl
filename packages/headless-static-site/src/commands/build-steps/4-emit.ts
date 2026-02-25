import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Vault, createThumbnailHelper } from "@iiif/helpers";
import type { Collection, Manifest } from "@iiif/presentation-3";
import PQueue from "p-queue";
import { getValue } from "../../extract/extract-label-string.ts";
import type { CanvasSearchIndex, CanvasSearchIndexFile } from "../../util/enrich.ts";
import { isEmpty } from "../../util/is-empty.ts";
import { makeProgressBar } from "../../util/make-progress-bar.ts";
import type { ActiveResourceJson } from "../../util/store.ts";
import type { BuildConfig } from "../build.ts";
import type { extract } from "./2-extract.ts";
import type { enrich } from "./3-enrich.ts";

export async function emit(
  {
    allResources,
    allPaths,
    idsToSlugs,
  }: {
    allResources: Array<ActiveResourceJson>;
    allPaths?: Record<string, string>;
    idsToSlugs?: Record<string, { slug: string; type: string }>;
  },
  { options, server, cacheDir, buildDir, log, imageServiceLoader, files, search, concurrency }: BuildConfig,
  { canvasSearchIndex }: { canvasSearchIndex?: CanvasSearchIndex }
) {
  if (!options.emit) {
    return {};
  }

  const start = Date.now();
  const stats = {
    collections: 0,
    manifests: 0,
    canvases: 0,
    total: 0,
  };
  const queue = new PQueue({ concurrency: concurrency.emit });
  const canvasQueue = new PQueue({ autoStart: false, concurrency: concurrency.emitCanvas });
  const canvasSearchIndexFile: CanvasSearchIndexFile = {};
  const siteMap: Record<
    string,
    {
      type: string;
      source: any;
      label?: string;
      canvases?: number;
      hasCanvasData?: boolean;
    }
  > = {};

  let totalResources = allResources.length;
  for (const resource of allResources) {
    totalResources += resource.subResources || 0;
  }

  if (options.exact) {
    console.log(`Saving ${totalResources} files`);
  }

  const progress = makeProgressBar("Saving output", totalResources, options.ui);

  const resolveFullId = (id: string) => {
    if (idsToSlugs?.[id]) {
      const { slug, type } = idsToSlugs[id];

      if (type === "Manifest") {
        return `${configUrl}/${slug}/manifest.json`;
      }
      if (type === "Collection") {
        return `${configUrl}/${slug}/collection.json`;
      }
    }
    return id;
  };

  const filesDir = join(cacheDir, "files");
  if (files.dirExists(filesDir) && !files.dirIsEmpty(filesDir)) {
    files.copy(filesDir, buildDir, { overwrite: true });
  }

  const configUrl = typeof server === "string" ? server : server?.url;
  const indexCollection: Record<string, any> = {};
  const indexCollectionMap: Record<string, any> = {};
  const storeCollections: Record<string, Array<any>> = {};
  const manifestCollection: any[] = [];
  const snippets: Record<string, any> = {};
  const metaThumbnailBySlug: Record<string, any> = {};
  const idToSlugMap: Record<
    string,
    {
      slug: string;
      type: string;
    }
  > = {};

  if (idsToSlugs) {
    for (const [id, value] of Object.entries(idsToSlugs)) {
      idToSlugMap[id] = value;
      if (configUrl) {
        const fileName = value.type === "Manifest" ? "manifest.json" : "collection.json";
        idToSlugMap[`${configUrl}/${value.slug}/${fileName}`] = value;
      }
    }
  }

  const normalizeThumbnail = (thumbnail: any) => {
    if (!thumbnail) {
      return null;
    }
    if (Array.isArray(thumbnail)) {
      return thumbnail.length ? thumbnail : null;
    }
    if (typeof thumbnail === "string") {
      return [{ id: thumbnail, type: "Image" }];
    }
    if (thumbnail.id || thumbnail["@id"]) {
      return [thumbnail];
    }
    return null;
  };

  const getMetaThumbnailForSlug = async (slug: string) => {
    if (Object.prototype.hasOwnProperty.call(metaThumbnailBySlug, slug)) {
      return metaThumbnailBySlug[slug];
    }

    const metaPath = join(cacheDir, slug, "meta.json");
    if (!files.exists(metaPath)) {
      metaThumbnailBySlug[slug] = null;
      return null;
    }

    const metaJson = await files.loadJson(metaPath);
    const thumbnail = normalizeThumbnail((metaJson as any).thumbnail || (metaJson as any).default?.thumbnail);
    metaThumbnailBySlug[slug] = thumbnail;
    return thumbnail;
  };

  for (let iteration = 0; iteration < 2; iteration++) {
    for (const manifest of allResources) {
      // Iteration 0: Skip collections.
      if (manifest.type === "Collection" && iteration === 0) {
        continue;
      }
      // Iteration 1: Skip manifests.
      if (manifest.type === "Manifest" && iteration === 1) {
        continue;
      }

      const { slug } = manifest;
      const manifestBuildDirectory = join(buildDir, slug);

      queue.add(async () => {
        const extension = manifest.type === "Manifest" ? "manifest.json" : "collection.json";
        const url = manifest.saveToDisk ? `${configUrl}/${slug}/${extension}` : manifest.path;

        const manifestBuildDirectory = join(buildDir, slug);
        const manifestCacheDirectory = join(cacheDir, slug);
        const cache = {
          "vault.json": join(manifestCacheDirectory, "vault.json"),
          "meta.json": join(manifestCacheDirectory, "meta.json"),
          "indices.json": join(manifestCacheDirectory, "indices.json"),
          "search-record.json": join(manifestCacheDirectory, "search-record.json"),
        };

        // const folderPath = allPaths[manifest.path];
        // const source = manifest.source;

        // Still always load the resource.
        const vaultJson = await files.loadJson(cache["vault.json"]);
        const vault = new Vault();
        vault.getStore().setState(vaultJson);

        // @todo thumbnail extraction step and use this.
        const getMetaThumbnail = async () => {
          try {
            const metaJson = await files.loadJson(cache["meta.json"]);
            return metaJson.thumbnail || metaJson.default?.thumbnail || null;
          } catch (err) {
            return null;
          }
        };

        const getThumbnail = async () => {
          try {
            if (resource.thumbnail) {
              return resource.thumbnail;
            }
            return getMetaThumbnail();
          } catch (err) {
            return null;
          }
        };

        const helper = createThumbnailHelper(vault, { imageServiceLoader });
        const ref = vault.get(manifest.id);
        const resource = vault.toPresentation3<Manifest | Collection>(ref);

        if (!resource) return;

        siteMap[manifest.slug] = {
          type: manifest.type,
          source: manifest.source,
          label: getValue(resource.label),
        };

        let thumbnail = null;
        if (manifest.type === "Manifest") {
          siteMap[manifest.slug].canvases = resource.items?.length;

          const maybeThumbnail = await getThumbnail();
          if (maybeThumbnail) {
            const best = Array.isArray(maybeThumbnail)
              ? maybeThumbnail[0]
              : typeof maybeThumbnail === "string"
                ? { id: maybeThumbnail }
                : maybeThumbnail;
            if (best) {
              thumbnail = { best };
            }
          }

          if (!thumbnail) {
            thumbnail = resource.thumbnail
              ? null
              : await helper.getBestThumbnailAtSize(
                  resource,
                  {
                    maxWidth: 512,
                    maxHeight: 512,
                  },
                  false
                );
          }
          if (!thumbnail?.best && !resource.thumbnail) {
            thumbnail = await helper.getBestThumbnailAtSize(
              resource,
              {
                maxWidth: 512,
                maxHeight: 512,
              },
              true
            );
          }
        }

        if (manifest.type === "Collection" && !resource.thumbnail) {
          const metaThumbnail = normalizeThumbnail(await getMetaThumbnail());
          if (metaThumbnail) {
            resource.thumbnail = metaThumbnail as any;
          }
        }

        const snippet = {
          id: url,
          type: resource.type,
          label: resource.label,
          "hss:slug": manifest.slug,
          thumbnail:
            resource.thumbnail ||
            (thumbnail?.best
              ? [
                  {
                    id: thumbnail.best.id,
                    type: "Image",
                    width: thumbnail.best.width,
                    height: thumbnail.best.height,
                  },
                ]
              : null) ||
            undefined,
        };
        snippets[url] = snippet;

        // Store collection.
        if (manifest.storeId) {
          storeCollections[manifest.storeId] = storeCollections[manifest.storeId] || [];
          storeCollections[manifest.storeId].push(snippet);
        }

        // Index collection.
        indexCollection[manifest.slug] = snippet;

        if (manifest.type === "Manifest") {
          manifestCollection.push(snippet);
        }

        // 1. create build directory
        await files.mkdir(manifestBuildDirectory);

        if (manifest.saveToDisk) {
          const fileName = manifest.type === "Manifest" ? "manifest.json" : "collection.json";

          // @todo allow raw preprocessing here.
          //   This is a weak part of the system for now.
          if (configUrl) {
            resource.id = `${configUrl}/${manifest.slug}/${fileName}`;
          }

          if (!(resource as any)["hss:slug"]) {
            (resource as any)["hss:slug"] = manifest.slug;
          }

          if (resource.type === "Collection") {
            if (!allPaths) {
              log("WARNING: Skipping Collection generation");
              return;
            }

            if (resource.items) {
              const rewrittenItems: any[] = [];
              for (const rawItem of resource.items as any[]) {
                const item = rawItem as any;
                if (allPaths[item.path]) {
                  if (item.type === "Manifest") {
                    item.id = `${configUrl}/${allPaths[item.path]}/manifest.json`;
                  } else {
                    item.id = `${configUrl}/${allPaths[item.path]}/collection.json`;
                  }
                }

                const newId = resolveFullId(item.id);
                if (newId) {
                  item.id = newId;
                }

                let hasSnippet = snippets[item.id];
                if (!hasSnippet) {
                  const lookup = item.id ? idToSlugMap[item.id] : null;
                  if (lookup) {
                    const fileName = lookup.type === "Manifest" ? "manifest.json" : "collection.json";
                    const resolvedId = configUrl ? `${configUrl}/${lookup.slug}/${fileName}` : item.id;
                    hasSnippet = snippets[resolvedId] || indexCollection[lookup.slug];
                    if (!hasSnippet) {
                      const fallbackThumbnail = await getMetaThumbnailForSlug(lookup.slug);
                      hasSnippet = {
                        label: item.label,
                        "hss:slug": lookup.slug,
                        thumbnail: fallbackThumbnail || undefined,
                      };
                    }
                  }
                }

                if (hasSnippet) {
                  item.label = item.label || hasSnippet.label;
                  item.thumbnail = item.thumbnail || hasSnippet.thumbnail;
                  item["hss:slug"] = item["hss:slug"] || hasSnippet["hss:slug"];
                }

                rewrittenItems.push(item);
              }
              resource.items = rewrittenItems as any;
            }

            if (!resource.thumbnail && resource.items?.length) {
              const firstItemWithThumbnail = resource.items.find((item: any) => item?.thumbnail);
              const derivedItemThumbnail = normalizeThumbnail(firstItemWithThumbnail?.thumbnail);
              if (derivedItemThumbnail) {
                resource.thumbnail = derivedItemThumbnail as any;
                snippet.thumbnail = derivedItemThumbnail;
              }
            }
          }

          files.saveJson(join(manifestBuildDirectory, fileName), resource);
        }

        if (canvasSearchIndex?.[manifest.slug]) {
          const searchIndexesToEmit = Object.keys(canvasSearchIndex[manifest.slug]);
          if (searchIndexesToEmit.length) {
            canvasSearchIndexFile[manifest.slug] = canvasSearchIndexFile[manifest.slug] || [];
            for (const searchIndex of searchIndexesToEmit) {
              const indexDetails = canvasSearchIndex[manifest.slug][searchIndex];
              const { records, remoteRecords } = indexDetails;

              if (remoteRecords.length) {
                for (const remoteRecord of remoteRecords) {
                  if (remoteRecord.url) {
                    canvasSearchIndexFile[manifest.slug].push({
                      index: searchIndex,
                      type: "remote",
                      canvasIndex: remoteRecord.canvasIndex,
                      canvas: remoteRecord.canvas,
                      format: remoteRecord.format,
                      url: remoteRecord.url,
                      recordId: remoteRecord.recordId,
                    });
                  }
                }
              }

              if (records.length) {
                const indexFile = `${searchIndex}.search.jsonl`;
                canvasSearchIndexFile[manifest.slug].push({
                  index: searchIndex,
                  type: "file",
                  format: "record-jsonl",
                  path: join(manifest.slug, indexFile),
                });
                await files.writeFile(
                  join(manifestBuildDirectory, indexFile),
                  records.map((item) => JSON.stringify(item)).join("\n")
                );
              }
            }
          }
        }

        files.copy(
          // 3. Save the meta file to disk
          join(cacheDir, manifest.slug, "meta.json"),
          join(manifestBuildDirectory, "meta.json"),
          { overwrite: true }
        );

        if (search.emitRecord && files.exists(join(cacheDir, manifest.slug, "search-record.json"))) {
          // Temporary? Or config?
          files.copy(
            // 3. Save the meta file to disk
            join(cacheDir, manifest.slug, "search-record.json"),
            join(manifestBuildDirectory, "search-record.json"),
            { overwrite: true }
          );
        }

        files.copy(join(cacheDir, manifest.slug, "indices.json"), join(manifestBuildDirectory, "indices.json"), {
          overwrite: true,
        });

        // 4. Copy the contents of `files/`
        const filesDir = join(cacheDir, manifest.slug, "files");
        if (existsSync(filesDir) && !isEmpty(filesDir)) {
          files.copy(filesDir, manifestBuildDirectory, { overwrite: true });
        }

        progress.increment();
      });

      // Canvases.
      canvasQueue.add(async () => {
        const canvasesDir = join(cacheDir, manifest.slug, "canvases");
        if (files.dirExists(canvasesDir)) {
          siteMap[manifest.slug].hasCanvasData = true;
          const canvasList = readdirSync(canvasesDir);
          for (const canvasIndex of canvasList) {
            const canvasDir = join(canvasesDir, canvasIndex);
            const metaFile = join(canvasDir, "meta.json");
            const canvasBuildDirectory = join(manifestBuildDirectory, "canvases", canvasIndex);
            await files.mkdir(canvasBuildDirectory);
            if (files.exists(metaFile)) {
              files.copy(join(canvasDir, "meta.json"), join(canvasBuildDirectory, "meta.json"), { overwrite: true });
            }
            const filesDir = join(canvasesDir, canvasIndex, "files");
            if (files.exists(filesDir) && !isEmpty(filesDir)) {
              files.copy(filesDir, canvasBuildDirectory, { overwrite: true });
            }

            progress.increment();
          }
        } else {
          progress.increment(manifest.subResources || 0);
        }
      });
    }
    await queue.onIdle();
    if (iteration === 0) {
      stats.manifests = Date.now() - start;
    }
    if (iteration === 1) {
      stats.collections = Date.now() - start - stats.manifests;
    }
  }

  const startCanvases = Date.now();
  canvasQueue.start();
  await canvasQueue.onIdle();
  stats.canvases = Date.now() - startCanvases;
  progress.stop();

  stats.total = Date.now() - start;

  // Emit the canvasSearchIndexFile
  // @todo also emit meta/search/{index}.mapping.json
  await files.saveJson(join(buildDir, "meta", "canvas-search-index.json"), canvasSearchIndexFile);

  return {
    stats,
    indexCollection,
    storeCollections,
    manifestCollection,
    siteMap,
  };
}
