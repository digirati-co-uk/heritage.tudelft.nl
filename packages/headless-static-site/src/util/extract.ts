import type { BuildConfig } from "../commands/build.ts";
import type { ResourceFilesApi } from "./create-resource-handler.ts";
import type { FileHandler } from "./file-handler.ts";
import type { IIIFRC } from "./get-config.ts";
import type { LazyValue } from "./lazy-value";
import type { ActiveResourceJson } from "./store";
import type { createStoreRequestCache } from "./store-request-cache.ts";

export interface ExtractionInvalidateApi {
  caches: LazyValue<Record<string, any>>;
  resource: any;
  parentResource?: ActiveResourceJson;
  parent?: any;
  build: BuildConfig;
  fileHandler: FileHandler;
  filesDir: string;
  resourceFiles: ResourceFilesApi;
}

interface ExtractionSetupApi {
  build: BuildConfig;
  config: IIIFRC;
  fileHandler: FileHandler;
}

export interface SearchRecordReturn {
  indexes?: string[];
  record: Record<string, any>;
}

export type SearchIndexes = {
  [k: string]: SearchExtractionConfig & {
    records: Array<Record<string, any>>;
    keys: string[];
    indexName: string;
    facets?: string[];
  };
};

type SearchFieldType =
  /** String values */
  | "string"
  /** Array of strings */
  | "string[]"
  /** Integer values up to 2,147,483,647 */
  | "int32"
  /** Array of int32 */
  | "int32[]"
  /** Integer values larger than 2,147,483,647 */
  | "int64"
  /** Array of int64 */
  | "int64[]"
  /** Floating point / decimal numbers */
  | "float"
  /** Array of floating point / decimal numbers */
  | "float[]"
  /** true or false */
  | "bool"
  /** Array of booleans */
  | "bool[]"
  /** Latitude and longitude specified as [lat, lng]. Read more here. */
  | "geopoint"
  /** Arrays of Latitude and longitude specified as [[lat1, lng1], [lat2, lng2]]. Read more here. */
  | "geopoint[]"
  /** Geographic polygon defined by an array of coordinates specified as [lat1, lng1, lat2, lng2, ...]. Latitude/longitude pairs must be in counter-clockwise (CCW) or clockwise (CW) order. Read more here. */
  | "geopolygon"
  /** Nested objects. Read more here. */
  | "object"
  /** Arrays of nested objects. Read more here. */
  | "object[]"
  /** Special type that automatically converts values to a string or string[]. */
  | "string*"
  /** Special type that is used to indicate a base64 encoded string of an image used for Image search. */
  | "image"
  /** Special type that automatically attempts to infer the data type based on the documents added to the collection. See automatic schema detection. */
  | "auto";

export interface SearchExtractionConfig {
  allIndices?: boolean;
  indices?: string[]; // @todo or list of valid ones.
  schema: {
    enable_nested_fields?: boolean;
    fields: Array<{
      name: string;
      type: SearchFieldType;
      reference?: string;
      facet?: boolean;
      optional?: boolean;
      index?: boolean;
    }>;
  };
}

export interface ExtractionReturn<Temp = any> {
  temp?: Temp;
  caches?: Record<string, any>;
  meta?: any;
  indices?: Record<string, string[]>;
  collections?: string[];
  didChange?: never;
  search?: SearchRecordReturn;
}

export interface Extraction<Config = any, Temp = any, TempInject = any> {
  id: string;
  name: string;
  types: string[];
  search?: Record<string, SearchExtractionConfig>;
  close?: (config: Config) => Promise<void>;
  collect?: (
    temp: Record<string, Temp>,
    api: ExtractionSetupApi,
    config: Partial<Config>
  ) => Promise<undefined | { temp: TempInject }>;
  collectManifest?: (
    resource: ActiveResourceJson,
    temp: Record<string, Temp>,
    api: ExtractionSetupApi,
    config: Partial<Config>
  ) => Promise<void>;
  injectManifest?: (
    resource: ActiveResourceJson,
    temp: TempInject,
    api: ExtractionSetupApi,
    config: Partial<Config>
  ) => Promise<ExtractionReturn<Temp>>;
  configure?: (api: ExtractionSetupApi, config: Partial<Config>) => Promise<Config>;
  invalidate: (resource: ActiveResourceJson, api: ExtractionInvalidateApi, config: Config) => Promise<boolean>;
  handler: (
    resource: ActiveResourceJson,
    api: {
      resource: any;
      meta: LazyValue<any>;
      indices: LazyValue<Record<string, string[]>>;
      caches: LazyValue<Record<string, any>>;
      searchRecord: LazyValue<Record<string, any>>;
      config: IIIFRC;
      build: BuildConfig;
      resourceFiles: ResourceFilesApi;
      parentResource?: ActiveResourceJson;
      parent?: any;
      filesDir: string;
      requestCache: ReturnType<typeof createStoreRequestCache>;
    },
    config: Config
  ) => Promise<ExtractionReturn<Temp>>;
}
