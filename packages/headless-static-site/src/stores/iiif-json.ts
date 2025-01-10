import { existsSync } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { cwd } from "node:process";
import { Vault } from "@iiif/helpers";
import type { Manifest } from "@iiif/presentation-3";
import { copy, pathExists } from "fs-extra/esm";
import objectHash from "object-hash";
import { isEmpty } from "../util/is-empty";
import { readAllFiles } from "../util/read-all-files";
import { readFilteredFiles } from "../util/read-filtered-files.ts";
import { rewritePath } from "../util/rewrite-path.ts";
import {
  type ParsedResource,
  type ProtoResourceDirectory,
  type Store,
  type StoreApi,
  createProtoDirectory,
} from "../util/store";
import { stringToLang } from "../util/string-to-lang.ts";

export interface IIIFJSONStore {
  type: "iiif-json";
  path: string;
  pattern?: string;
  ignore?: string | string[];
  subFiles?: boolean;
  base?: string;
  destination?: string;
}

export const IIIFJSONStore: Store<IIIFJSONStore> = {
  async parse(store: IIIFJSONStore, api: StoreApi): Promise<ParsedResource[]> {
    const allFiles = readFilteredFiles(store);
    const fileNameToPath = rewritePath(store);
    const newAllFiles: Array<[string, string]> = [];
    const subFileMap: Record<string, string[]> = {};
    const virtualCollectionsPath = join(api.build.virtualCacheDir, api.storeId);
    const fs = api.files;

    if (store.subFiles) {
      // Check for sub-files.
      // Sub-files work like this:
      //  - example/some-manifest.json <-- this is Manifest JSON itself on disk
      //  - example/some-manifest/some-image.jpg <-- this is a sub-file
      //
      // All files that are in a folder with the same name as the file, are considered sub-files if this
      // option is enabled. This allows for relative links to resources such as Annotation Lists to work.
      const allFilesWithoutExtension = allFiles.map(fileNameToPath);
      for (let i = 0; i < allFilesWithoutExtension.length; i++) {
        const file = allFilesWithoutExtension[i];
        let dupe = false;
        for (const toCompare of allFilesWithoutExtension) {
          if (file === toCompare) continue;
          if (file.startsWith(toCompare)) {
            dupe = true;
            if (!subFileMap[toCompare]) {
              subFileMap[toCompare] = [];
            }
            subFileMap[toCompare].push(allFiles[i]);
            break;
          }
        }
        if (!dupe) {
          newAllFiles.push([allFiles[i], allFilesWithoutExtension[i]]);
        }
      }
    } else {
      for (const file of allFiles) {
        newAllFiles.push([file, fileNameToPath(file)]);
      }
    }

    const manifests: ParsedResource[] = [];
    for (const [file, fileWithoutExtension] of newAllFiles) {
      const fileType = await api.build.fileTypeCache.getFileType(file);
      if (!fileType) {
        api.build.log(`Warning: Could not determine file type for "${file}"`);
      }
      const source: ProtoResourceDirectory["resource.json"]["source"] = {
        type: "disk",
        path: store.path,
      };

      if (store.path) {
        const dir = dirname(file);
        if (dir) {
          source.relativePath = relative(store.path, dir);
        }
      }

      // Virtual resource.
      if (file.endsWith("/_collection.yml") || file.endsWith("/_collection.yaml")) {
        const manifestsToInclude = newAllFiles.filter(([manifestFile, full]) => {
          if (!full.startsWith(fileWithoutExtension)) return false;
          if (manifestFile === file) return false;
          // We only want ones one level down.
          const relativeDir = relative(dirname(file), manifestFile);
          return !relativeDir.includes("/");
        });

        const loadedMetadata = await fs.readYaml(file);
        const { label, summary, metadata, type: _1, items: _2, ...rest } = loadedMetadata;
        const virtualCollection = {
          id: `virtual://${fileWithoutExtension}`,
          type: "Collection",
          label: label ? stringToLang(label) : fileWithoutExtension.split("/").pop() || fileWithoutExtension,
          summary: summary ? stringToLang(summary) : undefined,
          metadata: metadata
            ? metadata.map((item: any) => ({
                label: stringToLang(item.label),
                value: stringToLang(item.value),
              }))
            : undefined,
          // @todo metadata.
          items: manifestsToInclude.map(([manifestFile, fileWithoutExtension]) => {
            const relativePath = relative(dirname(file), manifestFile);
            return {
              id: `./${relativePath}`,
              type: "Manifest",
            };
          }),
          ...rest,
        };

        const filePath = join(virtualCollectionsPath, `${fileWithoutExtension}.json`);
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, JSON.stringify(virtualCollection, null, 2));
        await fs.loadJson(filePath);

        manifests.push({
          path: filePath,
          slug: fileWithoutExtension,
          type: "Collection",
          storeId: api.storeId,
          subFiles: subFileMap[fileWithoutExtension],
          source: source,
          saveToDisk: true,
          virtual: true,
        });
        continue;
      }

      manifests.push({
        path: file,
        slug: fileWithoutExtension,
        type: fileType || "Manifest",
        storeId: api.storeId,
        subFiles: subFileMap[fileWithoutExtension],
        source: source,
        saveToDisk: true,
      });
    }

    return manifests;
  },

  async invalidate(store: IIIFJSONStore, resource: ParsedResource, caches: ProtoResourceDirectory["caches.json"]) {
    if (!caches.load) {
      return true;
    }

    const key = await getKey(store, resource);
    return key !== caches.load;
  },

  async load(store: IIIFJSONStore, resource, directory, api): Promise<ProtoResourceDirectory> {
    const files = api.files;
    const cacheKey = await getKey(store, resource);
    const json = await files.loadJson(resource.path, true);
    const vault = new Vault();
    const id = json.id || json["@id"];

    if (!id) {
      throw new Error(`No id found in json${resource.path}`);
    }

    if (store.subFiles) {
      const subFilesFolderPath = resource.path.replace(".json", "");
      const subFilesFolder = existsSync(subFilesFolderPath);
      if (subFilesFolder) {
        if (subFilesFolder && (await pathExists(subFilesFolderPath)) && !isEmpty(subFilesFolderPath)) {
          const destination = join(cwd(), directory, "files");
          await copy(subFilesFolderPath, destination, { overwrite: true });
        }
      }
    }

    // Mapping real Manifests to virtual IDs.
    if (resource.virtual) {
      if (resource.source.type !== "disk") {
        throw new Error("Virtual resources must be loaded from disk");
      }
      const newItems = [];
      for (const item of json.items) {
        try {
          const { id, type, ...rest } = item;

          const loadedManifest = await files.loadJson(
            join(cwd(), resource.source.path, resource.source.relativePath || "", item.id)
          );
          const newId = loadedManifest.id || loadedManifest["@id"];
          const newType = loadedManifest.type || loadedManifest["@type"];
          newItems.push({
            id: newId,
            type: newType.includes("Collection") ? "Collection" : "Manifest",
            ...rest,
          });
        } catch (err) {
          console.error("Warning: error loading virtual collection item", item.id, err);
        }
      }
      json.items = newItems;
    }

    const res = await vault.load<Manifest>(id, json);
    if (!res) {
      throw new Error(`Failed to load resource: ${id}`);
    }

    return createProtoDirectory(
      {
        id,
        type: resource.type,
        path: resource.path,
        slug: resource.slug,
        storeId: resource.storeId,
        subResources: (res.items || []).length,
        saveToDisk: true,
        source: resource.source,
        virtual: resource.virtual,
      },
      vault,
      { load: cacheKey }
    );
  },
};

export async function getKey(store: { subFiles?: boolean }, resource: ParsedResource) {
  const file = await stat(resource.path);
  const key = `${file.mtime}-${file.ctime}-${file.size}`;

  if (store.subFiles) {
    const subFilesFolderPath = resource.path.replace(".json", "");
    const subFilesFolder = existsSync(subFilesFolderPath);
    if (subFilesFolder) {
      const allFiles = readAllFiles(subFilesFolderPath);
      const keys = [];
      for (const fileName of allFiles) {
        const file = await stat(fileName);
        keys.push(`${file.mtime}-${file.ctime}-${file.size}`);
      }

      const dirHash = objectHash(keys);
      return `${key}_dir: ${dirHash}`;
    }
  }

  return key;
}
