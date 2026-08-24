import { join } from "node:path";
import { IIIFBuilder } from "@iiif/builder";
import { Vault } from "@iiif/helpers";
import type { EnrichmentResult } from "./enrich";
import type { ExtractionReturn, SearchRecordReturn } from "./extract";
import type { FileHandler } from "./file-handler";
import { lazyValue } from "./lazy-value";
import { mergeIndices } from "./merge-indices";
import { mergeSearchResult } from "./merge-search-result";
import type { ActiveResourceJson } from "./store";

interface CreateCacheResourceOptions<Temp = any> {
  resource: { id: string; slug: string; vault?: Vault };
  temp: Record<string, Temp>;
  resourcePath: string;
  collections: Record<string, string[]>;
  parentManifest?: ActiveResourceJson;
  canvasIndex?: number;
  fileHandler: FileHandler;
}

type Result<Temp> = EnrichmentResult<Temp> | ExtractionReturn<Temp>;

export function createCacheResource({
  resourcePath,
  resource,
  temp,
  collections,
  parentManifest,
  canvasIndex,
  fileHandler,
}: CreateCacheResourceOptions) {
  const fs = fileHandler;
  const files = {
    "vault.json": join(resourcePath, "vault.json"),
    "caches.json": join(resourcePath, "caches.json"),
    "meta.json": join(resourcePath, "meta.json"),
    "indices.json": join(resourcePath, "indices.json"),
    "search-record.json": join(resourcePath, "search-record.json"),
  };
  const filesDir = join(resourcePath, "files");
  const vaultData = parentManifest ? null : fs.openJson(files["vault.json"]);
  const loadedCaches = lazyValue<Record<string, any>>(() => fs.loadJson(files["caches.json"]));
  const loadedMeta = lazyValue<Record<string, any>>(() => fs.loadJson(files["meta.json"]));
  const loadedIndices = lazyValue<Record<string, string[]>>(() => fs.loadJson(files["indices.json"]));
  const loadedSearchRecord = lazyValue<Partial<SearchRecordReturn>>(() => fs.loadJson(files["search-record.json"]));
  const newMeta = {};
  const newCaches = {};
  const newIndices = {};
  const newSearchRecord = {};
  let didChange = false;

  function getThumbnailId(thumbnail: any): string | undefined {
    if (!thumbnail) {
      return undefined;
    }
    if (typeof thumbnail === "string") {
      return thumbnail;
    }
    if (Array.isArray(thumbnail)) {
      return getThumbnailId(thumbnail[0]);
    }
    return thumbnail.id || thumbnail["@id"] || undefined;
  }

  function hasSearchRecordContext() {
    return Object.keys(newSearchRecord).length > 0 || fs.exists(files["search-record.json"]);
  }

  function syncSearchRecordFromMeta(metaUpdate: Record<string, any>) {
    // Keep extracted search records aligned with late meta updates (e.g. injected collection membership).
    if (!hasSearchRecordContext()) {
      return;
    }
    const record = (newSearchRecord as any).record || {};

    if ("partOfCollections" in metaUpdate) {
      record.collections = Array.isArray(metaUpdate.partOfCollections)
        ? metaUpdate.partOfCollections.map((c: any) => c?.slug).filter(Boolean)
        : [];
    }
    if ("thumbnail" in metaUpdate) {
      const thumbnailId = getThumbnailId(metaUpdate.thumbnail);
      if (thumbnailId) {
        record.thumbnail = thumbnailId;
      } else {
        delete record.thumbnail;
      }
    }
    if ("totalItems" in metaUpdate) {
      if (typeof metaUpdate.totalItems === "number") {
        record.totalItems = metaUpdate.totalItems;
      } else {
        delete record.totalItems;
      }
    }

    (newSearchRecord as any).record = record;
  }

  const caches = {
    get value() {
      return loadedCaches.value.then((current) => Object.assign(current || {}, newCaches));
    },
  };
  const meta = {
    get value() {
      return loadedMeta.value.then((current) => Object.assign(current || {}, newMeta));
    },
  };
  const indices = {
    get value() {
      return loadedIndices.value.then((current) => mergeIndices(current || {}, newIndices));
    },
  };
  const searchRecord = {
    get value() {
      return loadedSearchRecord.value.then((current) => mergeSearchResult(current || {}, newSearchRecord));
    },
  };

  return {
    vaultData,
    caches,
    searchRecord,
    meta,
    indices,
    filesDir,

    getCanvasResource(): ActiveResourceJson {
      if (!parentManifest) {
        throw new Error("Parent manifest is required");
      }

      return {
        id: resource.id,
        type: "Canvas",
        path: `${parentManifest.path}/canvases/${canvasIndex}`,
        slug: `${parentManifest.slug}/canvases/${canvasIndex}`,
        storeId: parentManifest.storeId,
        slugSource: parentManifest.slugSource,
        saveToDisk: false, // ?
        source: parentManifest.source,
        vault: parentManifest.vault,
      };
    },

    async attachVault(): Promise<any> {
      if (!vaultData) {
        throw new Error("Can only load Manifest Vault");
      }
      if (!resource.vault || !(resource.vault instanceof Vault)) {
        resource.vault = new Vault();
        resource.vault.getStore().setState(await vaultData);
      }

      return resource.vault.getObject(resource.id);
    },

    async getVaultBuilder() {
      if (!resource.vault) {
        this.attachVault();
      }
      return new IIIFBuilder(resource.vault as any);
    },

    async saveVault() {
      if (didChange && resource.vault) {
        await fs.saveJson(files["vault.json"], resource.vault.getStore().getState());
      }
    },

    didChange(value?: boolean) {
      if (typeof value === "undefined") return;
      didChange = didChange || value;
    },

    handleResponse(result: Result<any>, extraction: any) {
      if (result.temp) {
        if (parentManifest) {
          if (typeof canvasIndex === "undefined") {
            throw new Error("Canvas must have an index");
          }
          temp[extraction.id] = temp[extraction.id] || {};
          temp[extraction.id][parentManifest.slug] = temp[extraction.id][parentManifest.slug] || {};
          temp[extraction.id][parentManifest.slug].canvases = temp[extraction.id][parentManifest.slug].canvases || {};
          temp[extraction.id][parentManifest.slug].canvases[canvasIndex.toString()] = result.temp;
        } else {
          temp[extraction.id] = temp[extraction.id] || {};
          temp[extraction.id][resource.slug] = result.temp;
        }
      }
      if (result.meta) {
        Object.assign(newMeta, result.meta);
        syncSearchRecordFromMeta(result.meta);
      }
      if (result.caches) {
        Object.assign(newCaches, result.caches);
      }
      if (result.indices) {
        mergeIndices(newIndices, result.indices);
      }
      if (result.search) {
        mergeSearchResult(newSearchRecord, result.search);
      }

      if (result.collections) {
        for (const collectionSlug of result.collections) {
          collections[collectionSlug] = collections[collectionSlug] || [];
          collections[collectionSlug].push(resource.slug);
        }
      }
      didChange = didChange || result.didChange || false;
    },

    async save() {
      const hasNewMeta = Object.keys(newMeta).length > 0;
      const hasNewIndices = Object.keys(newIndices).length > 0;
      const hasNewCaches = Object.keys(newCaches).length > 0;
      const hasNewSearchRecord = Object.keys(newSearchRecord).length > 0;

      if (!hasNewMeta && !hasNewIndices && !hasNewCaches && !hasNewSearchRecord) {
        return;
      }

      await fs.mkdir(resourcePath);

      if (Object.keys(newMeta).length > 0) {
        await fs.saveJson(files["meta.json"], await meta.value);
      }
      if (Object.keys(newIndices).length > 0) {
        await fs.saveJson(files["indices.json"], await indices.value);
      }
      if (Object.keys(newCaches).length > 0) {
        await fs.saveJson(files["caches.json"], await caches.value);
      }
      if (Object.keys(newSearchRecord).length > 0) {
        await fs.saveJson(files["search-record.json"], await searchRecord.value);
      }
    },
  };
}
