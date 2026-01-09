import type { IIIFBuilder } from "@iiif/builder";
import type { BuildConfig } from "../commands/build.ts";
import type { ResourceFilesApi } from "./create-resource-handler.ts";
import type { RemoteRecordLink, SearchExtractionConfig, SearchRecordReturn } from "./extract.ts";
import type { FileHandler } from "./file-handler.ts";
import type { IIIFRC } from "./get-config";
import type { LazyValue } from "./lazy-value";
import type { ActiveResourceJson } from "./store";
import type { createStoreRequestCache } from "./store-request-cache.ts";

export interface EnrichmentHandlerApi {
  meta: LazyValue<Record<string, any>>;
  indices: LazyValue<Record<string, any>>;
  caches: LazyValue<Record<string, any>>;
  searchRecord: LazyValue<Record<string, any>>;
  config: IIIFRC;
  builder: IIIFBuilder;
  resource: any;
  files: string;
  requestCache: ReturnType<typeof createStoreRequestCache>;
  fileHandler: FileHandler;
  resourceFiles: ResourceFilesApi;
}

interface EnrichmentInvalidateApi {
  config: IIIFRC;
  resource: any;
  caches: LazyValue<Record<string, any>>;
  fileHandler: FileHandler;
  files: string;
  resourceFiles: ResourceFilesApi;
}

export interface EnrichmentResult<Temp = any> {
  temp?: Temp;
  didChange?: boolean;
  meta?: Record<string, any>;
  indices?: Record<string, any>;
  caches?: Record<string, any>;
  collections?: string[];
  search?: SearchRecordReturn;
}

export interface EnrichmentSetupApi {
  build: BuildConfig;
  config: IIIFRC;
  fileHandler: FileHandler;
}

export interface Enrichment<Config = any, Temp = any> {
  id: string;
  name: string;
  types: string[];
  search?: Record<string, SearchExtractionConfig>;
  close?: (config: Config) => Promise<void>;
  collect?: (temp: Record<string, Temp>, api: EnrichmentSetupApi, config: Partial<Config>) => Promise<void>;
  configure?: (api: EnrichmentSetupApi, config: Partial<Config>) => Promise<Config>;
  invalidate: (resource: ActiveResourceJson, api: EnrichmentInvalidateApi, config: Config) => Promise<boolean>;
  handler(resource: ActiveResourceJson, api: EnrichmentHandlerApi, config: Config): Promise<EnrichmentResult<Temp>>;
}

export type CanvasSearchIndex = Record<
  string,
  Record<
    string,
    {
      records: any[];
      remoteRecords: RemoteRecordLink[];
    }
  >
>;

type SupportedCanvasSearchIndexFileFormats = "record" | "record-jsonl" | "alto-xml";
export type AllCanvasSearchIndexFileFormats =
  | SupportedCanvasSearchIndexFileFormats
  | Omit<string, SupportedCanvasSearchIndexFileFormats>;

export type SearchIndexEntryFile = {
  index: string;
  type: "file";
  canvasIndex?: number;
  recordId?: string;
  canvas?: { w: number; h: number };
  format: AllCanvasSearchIndexFileFormats;
  path: string;
};

export type SearchIndexEntryRemote = {
  index: string;
  type: "remote";
  canvasIndex?: number;
  recordId?: string;
  canvas?: { w: number; h: number };
  format: AllCanvasSearchIndexFileFormats;
  url: string;
};

export type CanvasSearchIndexFile = Record<string, Array<SearchIndexEntryFile | SearchIndexEntryRemote>>;
