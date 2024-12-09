import { join } from 'node:path';
import { loadJson } from './load-json';
import { lazyValue } from './lazy-value';
import { ActiveResourceJson } from './store';
import { Vault } from '@iiif/helpers';
import { ExtractionReturn } from './extract';
import { mergeIndices } from './merge-indices';
import { mkdirp } from 'mkdirp';
import { EnrichmentResult } from './enrich';
import { IIIFBuilder } from '@iiif/builder';

interface CreateCacheResourceOptions<Temp = any> {
  resource: { id: string; slug: string; vault?: Vault };
  temp: Record<string, Temp>;
  resourcePath: string;
  collections: Record<string, string[]>;
  parentManifest?: ActiveResourceJson;
  canvasIndex?: number;
}

type Result<Temp> = EnrichmentResult<Temp> | ExtractionReturn<Temp>;
let didChange = false;

export function createCacheResource({
  resourcePath,
  resource,
  temp,
  collections,
  parentManifest,
  canvasIndex,
}: CreateCacheResourceOptions) {
  const files = {
    'vault.json': join(resourcePath, 'vault.json'),
    'caches.json': join(resourcePath, 'caches.json'),
    'meta.json': join(resourcePath, 'meta.json'),
    'indices.json': join(resourcePath, 'indices.json'),
  };
  const filesDir = join(resourcePath, 'files');
  const vaultData = parentManifest ? null : loadJson(files['vault.json']);
  const caches = lazyValue(() => loadJson(files['caches.json'], true));
  const meta = lazyValue(() => loadJson(files['meta.json'], true));
  const indices = lazyValue(() => loadJson(files['indices.json'], true));
  const newMeta = {};
  const newCaches = {};
  const newIndices = {};

  return {
    vaultData,
    caches,
    meta,
    indices,
    filesDir,

    getCanvasResource(): ActiveResourceJson {
      if (!parentManifest) {
        throw new Error('Parent manifest is required');
      }

      return {
        id: resource.id,
        type: 'Canvas',
        path: parentManifest.path + '/canvases/' + canvasIndex,
        slug: parentManifest.slug + '/canvases/' + canvasIndex,
        storeId: parentManifest.storeId,
        slugSource: parentManifest.slugSource,
        saveToDisk: false, // ?
        source: parentManifest.source,
        vault: parentManifest.vault,
      };
    },

    async attachVault(): Promise<any> {
      if (!vaultData) {
        throw new Error('Can only load Manifest Vault');
      }
      if (!resource.vault) {
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
        await Bun.write(files['vault.json'], JSON.stringify(resource.vault.getStore().getState(), null, 2));
      }
    },

    didChange(value?: boolean) {
      if (typeof value === 'undefined') return;
      didChange = didChange || value;
    },

    handleResponse(result: Result<any>, extraction: any) {
      if (result.temp) {
        if (parentManifest) {
          if (typeof canvasIndex === 'undefined') {
            throw new Error('Canvas must have an index');
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
      }
      if (result.caches) {
        Object.assign(newCaches, result.caches);
      }
      if (result.indices) {
        mergeIndices(newIndices, result.indices);
      }
      if (result.collections) {
        result.collections.forEach((collectionSlug) => {
          collections[collectionSlug] = collections[collectionSlug] || [];
          collections[collectionSlug].push(resource.slug);
        });
      }
      didChange = didChange || result.didChange || false;
    },

    async save() {
      const hasNewMeta = Object.keys(newMeta).length > 0;
      const hasNewIndices = Object.keys(newIndices).length > 0;
      const hasNewCaches = Object.keys(newCaches).length > 0;

      if (!hasNewMeta && !hasNewIndices && !hasNewCaches) {
        return;
      }

      await mkdirp(resourcePath);

      const savingFiles = [];
      if (Object.keys(newMeta).length > 0) {
        savingFiles.push(
          Bun.write(files['meta.json'], JSON.stringify(Object.assign(await meta.value, newMeta), null, 2))
        );
      }
      if (Object.keys(newIndices).length > 0) {
        savingFiles.push(
          Bun.write(files['indices.json'], JSON.stringify(mergeIndices(await indices.value, newIndices), null, 2))
        );
      }
      if (Object.keys(newCaches).length > 0) {
        savingFiles.push(
          Bun.write(files['caches.json'], JSON.stringify(Object.assign(await caches.value, newCaches), null, 2))
        );
      }

      if (savingFiles.length > 0) {
        await Promise.all(savingFiles);
      }
    },
  };
}
