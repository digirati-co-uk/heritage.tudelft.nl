import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Vault, createThumbnailHelper } from "@iiif/helpers";
import type { Collection, Manifest } from "@iiif/presentation-3";
import { copy } from "fs-extra/esm";
import { mkdirp } from "mkdirp";
import { getValue } from "../../extract/extract-label-string.ts";
import { isEmpty } from "../../util/is-empty.ts";
import { loadJson } from "../../util/load-json.ts";
import { makeProgressBar } from "../../util/make-progress-bar.ts";
import type { ActiveResourceJson } from "../../util/store.ts";
import type { BuildConfig } from "../build.ts";

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
  { options, server, cacheDir, buildDir, log, imageServiceLoader }: BuildConfig
) {
  if (!options.emit) {
    return {};
  }

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
  const savingFiles = [];
  let totalResources = allResources.length;
  for (const resource of allResources) {
    totalResources += resource.subResources || 0;
  }

  const progress = makeProgressBar("Saving output", totalResources);

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

  const saveJson = (file: string, contents: any) => {
    savingFiles.push(Bun.write(file, JSON.stringify(contents, null, 2)));
  };

  const filesDir = join(cacheDir, "files");
  if (existsSync(filesDir) && !isEmpty(filesDir)) {
    savingFiles.push(copy(filesDir, buildDir, { overwrite: true }));
  }

  const configUrl = typeof server === "string" ? server : server?.url;
  const indexCollection: Record<string, any> = {};
  const indexCollectionMap: Record<string, any> = {};
  const storeCollections: Record<string, Array<any>> = {};
  const manifestCollection: any[] = [];
  const snippets: Record<string, any> = {};

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
      const url = manifest.saveToDisk ? `${configUrl}/${slug}/manifest.json` : manifest.path;

      const manifestBuildDirectory = join(buildDir, slug);
      const manifestCacheDirectory = join(cacheDir, slug);
      const cache = {
        "vault.json": join(manifestCacheDirectory, "vault.json"),
        "meta.json": join(manifestCacheDirectory, "meta.json"),
        "indices.json": join(manifestCacheDirectory, "indices.json"),
      };

      // const folderPath = allPaths[manifest.path];
      // const source = manifest.source;

      // Still always load the resource.
      const vaultJson = await loadJson(cache["vault.json"]);
      const vault = new Vault();
      vault.getStore().setState(vaultJson);

      // @todo thumbnail extraction step and use this.
      const getThumbnail = async () => {
        try {
          if (resource.thumbnail) {
            return resource.thumbnail;
          }

          const metaJson = await import(cache["meta.json"]);
          return metaJson.thumbnail || metaJson.default.thumbnail || null;
        } catch (err) {
          return null;
        }
      };

      const helper = createThumbnailHelper(vault, { imageServiceLoader });
      const ref = vault.get(manifest.id);
      const resource = vault.toPresentation3<Manifest | Collection>(ref);

      if (!resource) continue;

      siteMap[manifest.slug] = {
        type: manifest.type,
        source: manifest.source,
        label: getValue(resource.label),
      };

      if (manifest.type === "Manifest") {
        siteMap[manifest.slug].canvases = resource.items?.length;
      }

      let thumbnail = null;

      const maybeThumbnail = await getThumbnail();
      if (maybeThumbnail) {
        thumbnail = { best: maybeThumbnail };
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

      const snippet = {
        id: url,
        type: manifest.type,
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
      await mkdirp(manifestBuildDirectory);

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
            continue;
          }

          if (resource.items) {
            resource.items = resource.items.map((item: any) => {
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

              if (item.type === "Manifest") {
                const hasSnippet = snippets[item.id];
                if (hasSnippet) {
                  item.label = item.label || hasSnippet.label;
                  item.thumbnail = item.thumbnail || hasSnippet.thumbnail;
                  item["hss:slug"] = hasSnippet["hss:slug"];
                }
              }

              return item;
            });
          }
        }

        saveJson(join(manifestBuildDirectory, fileName), resource);
      }

      // 3. Save the meta file to disk
      const meta = await readFile(join(cacheDir, manifest.slug, "meta.json"));
      savingFiles.push(Bun.write(join(manifestBuildDirectory, "meta.json"), meta));

      const indices = await readFile(join(cacheDir, manifest.slug, "indices.json"));
      savingFiles.push(Bun.write(join(manifestBuildDirectory, "indices.json"), indices));

      // 4. Copy the contents of `files/`
      const filesDir = join(cacheDir, manifest.slug, "files");
      if (existsSync(filesDir) && !isEmpty(filesDir)) {
        savingFiles.push(copy(filesDir, manifestBuildDirectory, { overwrite: true }));
      }

      await Promise.all(savingFiles);
      progress.increment();

      // Canvases.
      const canvasesDir = join(cacheDir, manifest.slug, "canvases");
      if (existsSync(canvasesDir)) {
        siteMap[manifest.slug].hasCanvasData = true;
        const canvasList = readdirSync(canvasesDir);
        for (const canvasIndex of canvasList) {
          const canvasDir = join(canvasesDir, canvasIndex);
          const metaFile = join(canvasDir, "meta.json");
          const canvasBuildDirectory = join(manifestBuildDirectory, "canvases", canvasIndex);
          await mkdirp(canvasBuildDirectory);
          if (existsSync(metaFile)) {
            const meta = await readFile(join(canvasDir, "meta.json"));
            savingFiles.push(Bun.write(join(canvasBuildDirectory, "meta.json"), meta));
          }
          const filesDir = join(canvasesDir, canvasIndex, "files");
          if (existsSync(filesDir) && !isEmpty(filesDir)) {
            savingFiles.push(copy(filesDir, canvasBuildDirectory, { overwrite: true }));
          }

          progress.increment();
        }
      } else {
        progress.increment(manifest.subResources || 0);
      }
    }
  }

  await Promise.all(savingFiles);
  progress.stop();

  return {
    indexCollection,
    storeCollections,
    manifestCollection,
    siteMap,
  };
}
