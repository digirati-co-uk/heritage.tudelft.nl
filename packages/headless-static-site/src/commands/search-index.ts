import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { existsSync } from "node:fs";
import { access, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";
import chalk from "chalk";
import Typesense, { type Client } from "typesense";
import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";
import { parseSingleCanvasAltoXML } from "../util/alto-xml-parser";
import type {
  AllCanvasSearchIndexFileFormats,
  CanvasSearchIndexFile,
  SearchIndexEntryFile,
  SearchIndexEntryRemote,
} from "../util/enrich";
import { defaultBuiltIns } from "./build";

const SEARCH_LOCK_FILENAME = "search-lock.json";
const CANVAS_INDEX_FILE = "meta/canvas-search-index.json";

interface SearchIndexCommandOptions {
  iiifBuildDir?: string;
  typesense: boolean;
  checkRemote?: boolean;
  frozenLockfile: boolean;
}

export async function searchIndexCommand(options: SearchIndexCommandOptions) {
  console.log(chalk.blue`Checking search indexes`);

  const result = await searchIndexReconciliation(options);

  // Save lock file.
  if (result.lockFile.hasChanged && !options.frozenLockfile) {
    await writeFile(join(cwd(), SEARCH_LOCK_FILENAME), JSON.stringify(result.lockFile.toJSON(), null, 2));
    console.log(chalk.green`✔ Lockfile updated`);
  }

  if (options.typesense) {
    console.log(chalk.blue`Typesense: Checking search indexes`);
    await searchIndexTypesense(options, result.lockFile);
  }
}

async function searchIndexReconciliation(options: SearchIndexCommandOptions) {
  const buildDir = getBuildDir(options);

  // Read the lock file if it exists
  const lockFileLocation = join(cwd(), SEARCH_LOCK_FILENAME);

  // Populate an object that represents the lock file
  const lockFile = await SearchLockFile.load(lockFileLocation);

  // Read the canvas index file
  const canvasIndexFilePath = join(cwd(), buildDir, CANVAS_INDEX_FILE);
  if (!existsSync(canvasIndexFilePath))
    throw new Error(`Canvas index file not found at ${join(buildDir, CANVAS_INDEX_FILE)}`);

  const canvasIndexFile = JSON.parse(await readFile(canvasIndexFilePath, "utf8")) as CanvasSearchIndexFile;

  const manifestSlugs = Object.keys(canvasIndexFile);
  // Iterate through and mark the changes to the lock file object:
  for (const manifestSlug of manifestSlugs) {
    const manifest = canvasIndexFile[manifestSlug];
    const lockFileEntry = lockFile.findManifest(manifestSlug);

    if (!lockFileEntry) {
      lockFile.addManifest(await SearchLockFileManifest.fromIndexFile(manifestSlug, manifest, buildDir));
      continue;
    }

    if (!lockFileEntry.matchesIndexFile(manifest, { buildDir, checkRemote: options.checkRemote })) {
      lockFileEntry.lockFileNeedsUpdated = true;
      lockFile.hasChanged = true;
      lockFileEntry.updateFromIndexFile(manifestSlug, manifest, buildDir);
    }

    // What else? The manifest file list could mismatch.
    // The lockfile might contain manifests that are not in the list.
  }

  if (lockFile.hasChanged && options.frozenLockfile) {
    throw new Error("Lock file has changed");
  }

  const toUpdate = lockFile.manifests.filter((manifest) => manifest.lockFileNeedsUpdated);
  const toDelete = lockFile.manifests.filter((manifest) => manifest.lockFileNeedsDeleted);
  const toCreate = lockFile.manifests.filter((manifest) => manifest.lockFileNeedsCreated);

  return {
    lockFile: lockFile,
    toUpdate,
    toDelete,
    toCreate,
  };
}

async function searchIndexTypesense(options: SearchIndexCommandOptions, lockFile: SearchLockFile) {
  const buildDir = getBuildDir(options);
  const CACHE_INDEX_NAME = process.env.TYPESENSE_CACHE_COLLECTION_NAME || "search-lock-file";
  const indexMapping = parseIndexMapping(process.env.SEARCH_INDEX_MAPPING || "");

  const search = new TypesenseSearchIndex({
    indexLocation: join(buildDir, "meta/search"),
    indexMapping,
  });
  const remoteLockFile = await search.getLockfile(CACHE_INDEX_NAME);

  // POSSIBLE FLAG: --index-all lockFile.toRecords() <- and then index.

  const results = await getSearchIndexTypesenseIndexChanges(remoteLockFile, lockFile);

  console.log(
    chalk.white(`
  - ${chalk.green(`${results.toAdd.length} to Add`)}
  - ${chalk.yellow(`${Object.keys(results.toEdit).length} to Edit`)}
  - ${chalk.red(`${results.toDelete.length} to Delete`)}
    `)
  );

  const allRecords = [];

  for (const manifestToAdd of results.toAdd) {
    allRecords.push(...(await manifestToAdd.toRecordsForIndex("canvases")));
  }

  let didTypesenseUpdate = false;

  const everythingToUpdate = [
    ...results.toAdd.map((manifest) => manifest.toRecords()),
    // @todo In the future we can do better granular updates here.
    ...Object.values(results.toEdit).map((result) => result.localManifest.toRecords()),
  ];

  function combineRecordIds(idMaps: Record<string, string[]>[]): Record<string, string[]> {
    const combined: Record<string, string[]> = {};
    for (const idMap of idMaps) {
      for (const [key, value] of Object.entries(idMap)) {
        if (!combined[key]) combined[key] = [];
        combined[key].push(...value);
      }
    }
    return combined;
  }

  const everythingToDelete = combineRecordIds(results.toDelete.map((r) => r.toRecordIds()));
  const toEditEntries = Object.values(results.toEdit);
  for (const toEdit of toEditEntries) {
    for (const toRemoveEdit of toEdit.toRemove) {
      if (!toRemoveEdit.recordId) continue;
      everythingToDelete[toRemoveEdit.index] = everythingToDelete[toRemoveEdit.index] || [];
      everythingToDelete[toRemoveEdit.index].push(toRemoveEdit.recordId);
    }
  }

  const combined = combineRecordIndexes(await Promise.all(everythingToUpdate));

  const indexes = deduplicateKeys(Object.keys(combined), Object.keys(everythingToDelete));
  for (const index of indexes) {
    const recordsToAdd = combined[index] || [];
    const recordsToDelete = everythingToDelete[index] || [];

    if (recordsToAdd.length !== 0) {
      // Will error if index does not exist.
      await search.ensureIndex(index);

      const uniqueRecordsToAdd = combineRecordList(recordsToAdd);
      await search.indexRecords(index, uniqueRecordsToAdd);
      didTypesenseUpdate = true;
    }

    if (recordsToDelete.length !== 0) {
      await search.deleteByIds(index, recordsToDelete);
      didTypesenseUpdate = true;
    }
  }

  if (didTypesenseUpdate) {
    console.log("Updated Typesense index");
    await search.updateLockfile(CACHE_INDEX_NAME, lockFile);
    console.log("Updated Typesense lock state");
  } else {
    console.log("No changes to Typesense index");
  }
}

function deduplicateKeys(a: string[], b: string[]) {
  return Array.from(new Set([...a, ...b]));
}

function combineRecordList(records: any[]) {
  const recordMap: any = {};

  for (const record of records) {
    if (!record.id) continue; // @todo log?
    recordMap[record.id] = {
      ...(recordMap[record.id] || {}),
      ...record,
    };
  }

  return Object.values(recordMap);
}

async function getSearchIndexTypesenseIndexChanges(remoteLockFile: SearchLockFile, lockFile: SearchLockFile) {
  const state = {
    toDelete: [] as SearchLockFileManifest[],
    toAdd: [] as SearchLockFileManifest[],
    toEdit: {} as Record<
      string,
      {
        localManifest: SearchLockFileManifest;
        toAdd: SearchLockFileEntry[];
        toUpdate: SearchLockFileEntry[];
        toRemove: SearchLockFileEntry[];
      }
    >,
  };

  // Check manifests to delete.
  for (const manifest of remoteLockFile.manifests) {
    const localManifest = lockFile.findManifest(manifest.manifestSlug);
    if (!localManifest) {
      state.toDelete.push(manifest);
    }
  }

  // Check manifests to update or insert.
  for (const localManifest of lockFile.manifests) {
    const remoteManifest = remoteLockFile.findManifest(localManifest.manifestSlug);
    if (!remoteManifest) {
      state.toAdd.push(localManifest);
      continue;
    }

    // The tricky part... what's updated.
    const result = localManifest.compare(remoteManifest);
    if (result.toAdd.length || result.toUpdate.length || result.toRemove.length) {
      state.toEdit[localManifest.manifestSlug] = {
        ...result,
        localManifest: localManifest,
      };
    }
  }

  return state;
}

function parseIndexMapping(input: string): Record<string, string> {
  const mapping: Record<string, string> = {};

  const items = input.split(",").map((s) => s.trim());
  for (const mappingItem of items) {
    const [from, to] = mappingItem.split(":").map((s) => s.trim());
    if (from && to) {
      mapping[from] = to;
    }
  }

  return mapping;
}

function getBuildDir(options: { iiifBuildDir?: string }) {
  return options.iiifBuildDir || defaultBuiltIns.defaultBuildDir;
}

class TypesenseSearchIndex {
  client: Client;
  indexLocation: string;
  indexMapping: Record<string, string>;

  constructor({ indexLocation, indexMapping }: { indexLocation: string; indexMapping: Record<string, string> }) {
    this.indexLocation = indexLocation;
    this.indexMapping = indexMapping;
    const typesenseApiKey = process.env.TYPESENSE_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_API_KEY;
    const typesenseHost = process.env.TYPESENSE_HOST || process.env.NEXT_PUBLIC_TYPESENSE_HOST;
    const typesensePort = Number.parseInt(
      process.env.TYPESENSE_PORT || process.env.NEXT_PUBLIC_TYPESENSE_PORT || "",
      10
    );
    const typesenseProtocol = process.env.TYPESENSE_PROTOCOL || process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL;

    if (!typesenseApiKey || !typesenseHost || !typesensePort || !typesenseProtocol) {
      throw new Error(`Missing Typesense configuration
    Please check your environment variables:
    - TYPESENSE_API_KEY
    - TYPESENSE_HOST
    - TYPESENSE_PORT
    - TYPESENSE_PROTOCOL`);
    }

    this.client = new Typesense.Client({
      nodes: [
        {
          host: typesenseHost,
          port: typesensePort,
          protocol: typesenseProtocol,
        },
      ],
      apiKey: typesenseApiKey,
      connectionTimeoutSeconds: 2,
    });
  }

  getIndex(name: string) {
    return this.indexMapping[name] || name;
  }

  async getSchemaForIndex(indexName: string) {
    const pathName = join(this.indexLocation, `${indexName}.schema.json`);
    const file = await readFile(pathName, "utf8");
    return JSON.parse(file);
  }

  async ensureIndex(inputIndexName: string, forceRecreate = false) {
    const indexName = this.getIndex(inputIndexName);
    this.client.collections(indexName);
    const collections = await this.client.collections().retrieve();
    const collection = collections.find((c) => c.name === indexName);

    if (!collection || forceRecreate) {
      const schema = await this.getSchemaForIndex(indexName);
      await this.client.collections().create(schema);
      return true;
    }

    return false;
  }

  async deleteByIds(inputIndexName: string, ids: string[]) {
    const indexName = this.getIndex(inputIndexName);
    if (ids.length === 0) return;
    const filter = `id: [${ids.join(", ")}]`;
    await this.client.collections(indexName).documents().delete({
      filter_by: filter,
    });
  }

  async indexRecords(inputIndexName: string, records: any[]) {
    const indexName = this.getIndex(inputIndexName);
    await this.client.collections(indexName).documents().import(records, {
      action: "upsert",
      dirty_values: "coerce_or_drop",
    });
  }

  async updatePartialRecords(inputIndexName: string, records: Array<{ id: string } & object>) {
    const indexName = this.getIndex(inputIndexName);
    await this.client.collections(indexName).documents().import(records, {
      action: "update",
      dirty_values: "coerce_or_drop",
    });
  }

  async getLockfile(inputIndexName: string) {
    const indexName = this.getIndex(inputIndexName);
    if (await this.ensureCacheCollection(indexName)) {
      console.log("Lockfile state created on Typesense");
    }
    const cacheJsonLines = await this.client.collections(indexName).documents().export();
    return SearchLockFile.fromTypesenseExport(cacheJsonLines);
  }

  async updateLockfile(inputIndexName: string, lockfile: SearchLockFile) {
    const indexName = this.getIndex(inputIndexName);
    // @todo update typesense versions + change this to truncate.
    await this.client.collections(indexName).delete();
    await this.ensureCacheCollection(indexName);

    await this.client.collections(indexName).documents().import(lockfile.toTypesense(), {
      action: "upsert",
    });
  }

  async ensureTypesenseCollection(inputIndexName: string, schema: CollectionCreateSchema): Promise<boolean> {
    const indexName = this.getIndex(inputIndexName);
    const collections = await this.client.collections().retrieve();
    const collection = collections.find((c) => c.name === indexName);

    if (!collection) {
      schema.name = indexName;
      await this.client.collections().create(schema);
      return true;
    }
    return false;
  }

  async ensureCacheCollection(inputIndexName: string): Promise<boolean> {
    const indexName = this.getIndex(inputIndexName);
    const schema: CollectionCreateSchema = {
      name: indexName,
      enable_nested_fields: true,
      fields: [
        { name: "format", type: "string", facet: false },
        { name: "location.type", type: "string", facet: false },
        { name: "location.url", type: "string", facet: false, optional: true },
        { name: "location.path", type: "string", facet: false, optional: true },
        { name: "hash", type: "string", facet: false },
        { name: "lastModified", type: "string", facet: false },
        { name: "index", type: "string", facet: false },
        { name: "manifestId", type: "string", facet: false },
      ],
    };

    return await this.ensureTypesenseCollection(indexName, schema);
  }
}

export class SearchLockFile {
  contents: any;
  manifests: SearchLockFileManifest[];
  version: string;
  lastUpdated: Date;
  hasChanged = false;

  constructor(input: { contents: any; manifests: SearchLockFileManifest[]; version: string; lastUpdated: Date }) {
    this.contents = input.contents;
    this.manifests = input.manifests;
    this.version = input.version;
    this.lastUpdated = input.lastUpdated;
  }

  static async load(name: string) {
    if (!existsSync(name)) {
      return new SearchLockFile({
        contents: {},
        manifests: [],
        version: "1.0",
        lastUpdated: new Date(),
      });
    }

    const file = await readFile(name, "utf8");
    const json = JSON.parse(file) as SearchLockFileRaw;

    // @todo validate better.
    if (!json || !json.version || !json.entries) {
      throw new Error("Invalid search lock file");
    }

    return SearchLockFile.fromFile(json);
  }

  static fromTypesenseExport(jsonl: string) {
    const typesenseEntries = jsonl
      .split("\n")
      .filter(Boolean)
      .map((json) => JSON.parse(json)) as SearchLockFileEntryRaw[];

    const entries: SearchLockFileRaw["entries"] = {};
    for (const entry of typesenseEntries) {
      entries[entry.manifestId] = entries[entry.manifestId] || [];
      entries[entry.manifestId].push(entry);
    }

    return SearchLockFile.fromFile({
      version: "1.0",
      entries,
      lastModified: "",
    });
  }

  static fromFile(file: SearchLockFileRaw) {
    const manifests = Object.entries(file.entries).map(([key, value]) =>
      SearchLockFileManifest.fromFileEntry(key, value)
    );
    const lastUpdated = manifests.reduce((acc, manifest) => Math.max(acc, manifest.lastUpdated.getTime()), 0);

    return new SearchLockFile({
      contents: file,
      manifests,
      version: file.version,
      lastUpdated: new Date(lastUpdated),
    });
  }

  static async exists(name: string): Promise<boolean> {
    try {
      await access(name, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  toJSON() {
    return {
      version: this.version,
      lastModified: this.lastUpdated.toISOString(),
      entries: Object.fromEntries(
        this.manifests.map((manifest) => [manifest.manifestSlug, manifest.entries.map((entry) => entry.toFileEntry())])
      ),
    };
  }

  async save(path: string): Promise<void> {
    const data = this.toJSON();
    await writeFile(path, JSON.stringify(data, null, 2), "utf8");
  }

  findManifest(manifestSlug: string): SearchLockFileManifest | undefined {
    return this.manifests.find((manifest) => manifest.manifestSlug === manifestSlug);
  }

  addManifest(manifest: SearchLockFileManifest): void {
    manifest.lockFileNeedsCreated = true;
    this.manifests.push(manifest);
    this.lastUpdated = new Date(Math.max(this.lastUpdated.getTime(), manifest.lastUpdated.getTime()));
    this.hasChanged = true;
  }

  removeManifest(manifestSlug: string): void {
    const index = this.manifests.findIndex((manifest) => manifest.manifestSlug === manifestSlug);
    if (index !== -1) {
      this.hasChanged = true;
      this.manifests[index].lockFileNeedsDeleted = true;
    }
  }

  toTypesense() {
    return this.manifests.flatMap((manifest) => manifest.toTypesense());
  }

  async toRecordsForIndex(index: string) {
    const records = [];
    for (const entry of this.manifests) {
      records.push(...(await entry.toRecordsForIndex(index)));
    }
    return records;
  }

  async toRecords() {
    const indexes = await Promise.all(this.manifests.map((entity) => entity.toRecords()));
    return combineRecordIndexes(indexes);
  }
}

function combineRecordIndexes(records: Record<string, any[]>[]) {
  const indexes: Record<string, any[]> = {};
  for (const record of records) {
    const keys = Object.keys(record);
    for (const key of keys) {
      indexes[key] = indexes[key] || [];
      indexes[key].push(...record[key]);
    }
  }
  return indexes;
}

export class SearchLockFileManifest {
  manifestSlug: string;
  lastUpdated: Date;
  combinedHash: string;
  entries: SearchLockFileEntry[];
  hasChanged: boolean;

  // State for lock file
  lockFileNeedsUpdated = false;
  lockFileNeedsCreated = false;
  lockFileNeedsDeleted = false;
  lockFileSkip = false;

  // State for the process.
  remoteNeedsUpdated = false;
  remoteNeedsCreated = false;
  remoteNeedsDeleted = false;
  remoteSkip = false;

  constructor(input: {
    manifestSlug: string;
    lastUpdated: Date;
    combinedHash: string;
    entries: SearchLockFileEntry[];
  }) {
    this.manifestSlug = input.manifestSlug;
    this.lastUpdated = input.lastUpdated;
    this.combinedHash = input.combinedHash;
    this.entries = input.entries;
    this.hasChanged = false;
  }

  toTypesense() {
    return this.entries.map((entry) => ({
      id: entry.ident(),
      ...entry.toFileEntry(),
    }));
  }

  recalculate() {
    const lastUpdated = this.entries.reduce((acc, entry) => Math.max(acc, entry.lastModified.getTime()), 0);
    const allHashesCombined = combinedHash(this.entries.map((entry) => entry.hash));

    if (lastUpdated > this.lastUpdated.getTime() || allHashesCombined !== this.combinedHash) {
      this.lastUpdated = new Date(lastUpdated);
      this.combinedHash = allHashesCombined;
      this.hasChanged = true;
    }
  }

  addEntry(entry: SearchLockFileEntry) {
    entry.lockFileNeedsCreated = true;
    this.entries.push(entry);
    this.recalculate();
  }

  removeEntry(urlOrFile: string): void {
    const index = this.entries.findIndex((entry) => entry.ident() === urlOrFile);
    if (index !== -1) {
      this.entries[index].lockFileNeedsDeleted = true;
    }
  }

  findEntry(urlOrFile: string & { _t: "tagged" }): SearchLockFileEntry | undefined {
    return this.entries.find((entry) => entry.ident() === urlOrFile);
  }

  compare(other: SearchLockFileManifest): {
    toAdd: SearchLockFileEntry[];
    toUpdate: SearchLockFileEntry[];
    toRemove: SearchLockFileEntry[];
  } {
    const toAdd: SearchLockFileEntry[] = [];
    const toUpdate: SearchLockFileEntry[] = [];
    const toRemove: SearchLockFileEntry[] = [];

    // Find entries to add or update
    for (const entry of this.entries) {
      const otherEntry = other.findEntry(entry.ident());
      if (!otherEntry) {
        toAdd.push(entry);
      } else if (entry.hasChanged(otherEntry)) {
        toUpdate.push(entry);
      }
    }

    // Find entries to remove
    for (const otherEntry of other.entries) {
      const thisEntry = this.findEntry(otherEntry.ident());
      if (!thisEntry) {
        toRemove.push(otherEntry);
      }
    }

    return { toAdd, toUpdate, toRemove };
  }

  static fromFileEntry(key: string, value: Array<SearchLockFileEntryRaw>) {
    const entries = value.map((entry) => SearchLockFileEntry.fromFileEntry(entry));
    const lastUpdated = entries.reduce((acc, entry) => Math.max(acc, entry.lastModified.getTime()), 0);
    const allHashes = entries.map((entry) => entry.hash);

    return new SearchLockFileManifest({
      manifestSlug: key,
      lastUpdated: new Date(lastUpdated),
      combinedHash: combinedHash(allHashes),
      entries,
    });
  }

  async matchesIndexFile(
    data: CanvasSearchIndexFile[string],
    options: {
      buildDir: string;
      checkRemote?: boolean;
    }
  ) {
    const { buildDir, checkRemote } = options;
    // Does the current entry match the passed in data.
    for (const file of data) {
      if (file.type === "file") {
        const fullPath = join(buildDir, file.path);
        const entry = this.findEntry(fullPath as any);
        if (!entry) return false;

        // Todo option for checkFileHash
        if (!entry.matchesFile(file, buildDir)) {
          return false;
        }
      }

      if (file.type === "remote") {
        const entry = this.findEntry(file.url as any);
        if (!entry) return false;
        if (!entry.matchesRemote(file, { checkRemote })) {
          return false;
        }
      }
    }
    return true;
  }

  async updateFromIndexFile(key: string, data: CanvasSearchIndexFile[string], buildDir: string) {
    for (const item of data) {
      if (item.type === "file") {
        const entry = this.findEntry(item.path as any);
        if (entry) {
          // @todo do something better than this..
          this.removeEntry(entry.ident());
        }
        this.addEntry(await SearchLockFileEntry.file(key, item, buildDir));
      }
      if (item.type === "remote") {
        const entry = this.findEntry(item.url as any);
        if (entry) {
          this.removeEntry(entry.ident());
        }
        this.addEntry(await SearchLockFileEntry.link(key, item));
      }
    }
  }

  static async fromIndexFile(key: string, data: CanvasSearchIndexFile[string], buildDir: string) {
    const entries: SearchLockFileEntry[] = [];
    for (const item of data) {
      if (item.type === "file") {
        entries.push(await SearchLockFileEntry.file(key, item, buildDir));
      }
      if (item.type === "remote") {
        entries.push(await SearchLockFileEntry.link(key, item));
      }
    }

    const lastUpdated = entries.reduce((acc, entry) => Math.max(acc, entry.lastModified.getTime()), 0);
    const allHashes = entries.map((entry) => entry.hash);

    return new SearchLockFileManifest({
      manifestSlug: key,
      lastUpdated: new Date(lastUpdated),
      combinedHash: combinedHash(allHashes),
      entries,
    });
  }

  toRecordIds() {
    const indexes: Record<string, string[]> = {};
    for (const entry of this.entries) {
      indexes[entry.index] = indexes[entry.index] || [];
      if (entry.recordId && !indexes[entry.index].includes(entry.recordId)) {
        indexes[entry.index].push(entry.recordId);
      }
    }
    return indexes;
  }

  async toRecords() {
    const indexes: Record<string, any[]> = {};
    for (const entry of this.entries) {
      indexes[entry.index] = indexes[entry.index] || [];
      indexes[entry.index].push(...(await entry.toRecords()));
    }
    return indexes;
  }

  async toRecordsForIndex(indexName: string) {
    const records = [];
    const filtered = this.entries.filter((t) => t.index === indexName);
    for (const entry of filtered) {
      records.push(...(await entry.toRecords()));
    }
    return records;
  }
}

function combinedHash(hashes: string[]) {
  const sortedHashes = hashes.toSorted().join("");
  return createHash("sha256").update(sortedHashes).digest("hex");
}

type SearchLockFileRaw = {
  version: string;
  lastModified: string;
  entries: Record<string, SearchLockFileEntryRaw[]>;
};
type SearchLockFileEntryLocationType = { type: "file"; path: string } | { type: "url"; url: string };
type SearchLockFileEntryRaw = {
  location: SearchLockFileEntryLocationType;
  format: AllCanvasSearchIndexFileFormats;
  lastModified: string;
  index: string;
  hash: string;
  manifestId: string;
  recordId?: string;
};

export class SearchLockFileEntry {
  location: SearchLockFileEntryLocationType;
  format: AllCanvasSearchIndexFileFormats;
  lastModified: Date;
  index: string;
  recordId?: string;
  canvas?: { w: number; h: number };
  canvasIndex?: number;
  hash: string;
  manifestId: string;
  deleted?: boolean;

  // State for the process.
  remoteNeedsUpdated = false;
  remoteNeedsCreated = false;
  remoteNeedsDeleted = false;
  remoteSkip = false;

  // State for lock file
  lockFileNeedsUpdated = false;
  lockFileNeedsCreated = false;
  lockFileNeedsDeleted = false;
  lockFileSkip = false;

  constructor(data: {
    location: SearchLockFileEntryLocationType;
    lastModified: Date;
    format: AllCanvasSearchIndexFileFormats;
    index: string;
    hash: string;
    manifestId: string;
    deleted?: boolean;
    recordId?: string;
    canvas?: { w: number; h: number };
    canvasIndex?: number;
  }) {
    this.location = data.location;
    this.lastModified = data.lastModified;
    this.index = data.index;
    this.format = data.format;
    this.hash = data.hash;
    this.manifestId = data.manifestId;
    this.canvas = data.canvas;
    this.canvasIndex = data.canvasIndex;
    this.recordId = data.recordId;
  }

  ident(): string & { _t: "tagged" } {
    if (this.location.type === "file") {
      return this.location.path as any;
    }
    return this.location.url as any;
  }

  static fromFileEntry(fileEntry: SearchLockFileEntryRaw) {
    return new SearchLockFileEntry({
      location: fileEntry.location,
      lastModified: new Date(fileEntry.lastModified),
      index: fileEntry.index,
      hash: fileEntry.hash,
      format: fileEntry.format,
      manifestId: fileEntry.manifestId,
      recordId: fileEntry.recordId,
    });
  }

  static async file(manifestSlug: string, file: SearchIndexEntryFile, buildDir: string) {
    const fullPath = join(buildDir, file.path);
    const fileDetails = await stat(fullPath);

    return new SearchLockFileEntry({
      location: {
        type: "file",
        path: fullPath,
      },
      canvas: file.canvas,
      canvasIndex: file.canvasIndex,
      lastModified: fileDetails.mtime,
      index: file.index,
      hash: await fileHash(fullPath),
      manifestId: manifestSlug,
      format: file.format,
      recordId: file.recordId,
    });
  }

  async matchesFile(file: SearchIndexEntryFile, buildDir: string): Promise<boolean> {
    const fullPath = join(buildDir, file.path);
    const fileDetails = await stat(fullPath);
    if (this.location.type !== "file") {
      return false;
    }

    return (
      this.location.path === fullPath &&
      this.lastModified.getTime() === fileDetails.mtime.getTime() &&
      this.hash === (await fileHash(fullPath)) &&
      this.format === file.format &&
      this.recordId === file.recordId &&
      this.canvasIndex === file.canvasIndex &&
      this.index === file.index &&
      this.canvas === file.canvas
    );
  }

  static async link(manifestSlug: string, link: SearchIndexEntryRemote) {
    // @todo caching.
    const fetched = await fetch(link.url);
    const content = await fetched.text();
    const hash = createHash("sha256").update(content).digest("hex");
    const lastModified = fetched.headers.get("Last-Modified");

    return new SearchLockFileEntry({
      location: {
        type: "url",
        url: link.url,
      },
      recordId: link.recordId,
      canvas: link.canvas,
      canvasIndex: link.canvasIndex,
      format: link.format,
      lastModified: lastModified ? new Date(lastModified) : new Date(),
      index: link.index,
      hash,
      manifestId: manifestSlug,
    });
  }

  async matchesRemote(link: SearchIndexEntryRemote, options: { checkRemote?: boolean }): Promise<boolean> {
    let matches = true;

    if (options.checkRemote) {
      const fetched = await fetch(link.url);
      const content = await fetched.text();
      const hash = createHash("sha256").update(content).digest("hex");
      const lastModified = fetched.headers.get("Last-Modified");

      if (this.hash !== hash) {
        matches = false;
      }

      if (lastModified && this.lastModified.getTime() !== new Date(lastModified).getTime()) {
        matches = false;
      }
    }

    if (!matches) return false;

    return (
      this.format === link.format &&
      this.index === link.index &&
      this.recordId === link.recordId &&
      this.canvas === link.canvas &&
      this.canvasIndex === link.canvasIndex
    );
  }

  hasChanged(remoteEntry: SearchLockFileEntry) {
    return this.lastModified.getTime() !== remoteEntry.lastModified.getTime() || this.hash !== remoteEntry.hash;
  }

  toFileEntry(): SearchLockFileEntryRaw {
    return {
      location: this.location,
      lastModified: this.lastModified.toISOString(),
      index: this.index,
      hash: this.hash,
      format: this.format,
      manifestId: this.manifestId,
      recordId: this.recordId,
    };
  }

  equals(other: SearchLockFileEntry): boolean {
    return (
      this.index === other.index &&
      this.hash === other.hash &&
      this.lastModified.getTime() === other.lastModified.getTime() &&
      this.manifestId === other.manifestId &&
      JSON.stringify(this.location) === JSON.stringify(other.location)
    );
  }

  async loadData() {
    if (this.location.type === "file") {
      return {
        type: "file",
        format: this.format,
        text: await readFile(this.location.path),
      };
    }
    if (this.location.type === "url") {
      return {
        type: "url",
        format: this.format,
        text: await fetch(this.location.url).then((response) => response.text()),
      };
    }

    throw new Error(`Unsupported location type: ${(this.location as any).type}`);
  }

  async toRecords() {
    const data = await this.loadData();

    switch (data.format) {
      case "record": {
        const parsed = JSON.parse(data.text.toString("utf-8"));
        if (this.recordId) {
          return { id: this.recordId, ...parsed };
        }
        return [parsed];
      }
      case "record-jsonl": {
        const parts = data.text.toString("utf-8").split("\n");
        return parts.map((part) => JSON.parse(part));
      }
      case "alto-xml": {
        if (!this.recordId) {
          console.log("For alto-xml you need to return a `recordId` in the script");
          return [];
        }

        try {
          const parsed = await parseSingleCanvasAltoXML(data.text, this.recordId, this.canvas);
          if (parsed) {
            return [parsed];
          }
        } catch (e) {
          // log?
        }
      }
    }
    return [];
  }
}

export class SearchRemoteState {
  entries: SearchLockFileEntry[];
  constructor(input: { entries: SearchLockFileEntry[] }) {
    this.entries = input.entries;
  }

  static fromDocuments(documents: any[]) {
    throw new Error("Not implemented");
  }

  compare(lockFile: SearchLockFile): {
    toCreate: SearchLockFileEntry[];
    toUpdate: SearchLockFileEntry[];
    toDelete: SearchLockFileEntry[];
    toSkip: SearchLockFileEntry[];
  } {
    const toCreate: SearchLockFileEntry[] = [];
    const toUpdate: SearchLockFileEntry[] = [];
    const toDelete: SearchLockFileEntry[] = [];
    const toSkip: SearchLockFileEntry[] = [];

    // Create a map of remote entries for efficient lookup
    const remoteEntryMap = new Map<string & { _t: "tagged" }, SearchLockFileEntry>();
    for (const entry of this.entries) {
      remoteEntryMap.set(entry.ident(), entry);
    }

    // Check lock file entries against remote
    for (const manifest of lockFile.manifests) {
      for (const entry of manifest.entries) {
        const remoteEntry = remoteEntryMap.get(entry.ident());

        if (!remoteEntry) {
          // Entry exists in lock file but not in remote - create it
          entry.remoteNeedsCreated = true;
          toCreate.push(entry);
        } else if (entry.hasChanged(remoteEntry)) {
          // Entry exists in both but has changed - update it
          entry.remoteNeedsUpdated = true;
          toUpdate.push(entry);
        } else {
          // Entry is the same - skip it
          entry.remoteSkip = true;
          toSkip.push(entry);
        }
      }
    }

    // Check for remote entries that don't exist in lock file - delete them
    for (const [identity, remoteEntry] of remoteEntryMap) {
      let foundInLockFile = false;

      for (const manifest of lockFile.manifests) {
        if (manifest.findEntry(identity)) {
          foundInLockFile = true;
          break;
        }
      }

      if (!foundInLockFile) {
        remoteEntry.remoteNeedsDeleted = true;
        toDelete.push(remoteEntry);
      }
    }

    return { toCreate, toUpdate, toDelete, toSkip };
  }
}

async function fileHash(filePath: string) {
  const content = await readFile(filePath, "utf8");
  const hash = createHash("sha256").update(content).digest("hex");
  return hash;
}
