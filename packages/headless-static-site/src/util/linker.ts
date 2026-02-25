import type { IIIFBuilder } from "@iiif/builder";
import type { BuildConfig } from "../commands/build.ts";
import type { ResourceFilesApi } from "./create-resource-handler.ts";
import type { FileHandler } from "./file-handler.ts";
import type { IIIFRC } from "./get-config.ts";
import type { LazyValue } from "./lazy-value.ts";
import type { ActiveResourceJson } from "./store.ts";

export interface LinkerTargetSplit {
  id: string;
  fragment: string | null;
}

export interface CanvasOwner {
  manifest: ActiveResourceJson;
  canvasIndex: number;
}

export interface LinkerHelpers {
  splitTarget: (target: string) => LinkerTargetSplit;
  getManifestById: (id: string) => ActiveResourceJson | null;
  getCanvasOwner: (canvasId: string) => Promise<CanvasOwner | null>;
}

export interface LinkerPreparedData<Data = any> {
  byResourceId?: Record<string, Data>;
  byResourceSlug?: Record<string, Data>;
}

interface LinkerSetupApi {
  build: BuildConfig;
  config: IIIFRC;
  fileHandler: FileHandler;
}

interface LinkerPrepareApi {
  build: BuildConfig;
  config: IIIFRC;
  fileHandler: FileHandler;
  resources: ActiveResourceJson[];
  manifests: ActiveResourceJson[];
  helpers: LinkerHelpers;
  trackFile: (path: string) => void;
  trackedFiles: string[];
}

interface LinkerInvalidateApi {
  build: BuildConfig;
  config: IIIFRC;
  resource: any;
  builder: IIIFBuilder;
  helpers: LinkerHelpers;
  prepared?: any;
  preparedAll?: LinkerPreparedData<any>;
  prepareHash?: string;
  caches: LazyValue<Record<string, any>>;
  filesDir: string;
  fileHandler: FileHandler;
  resourceFiles: ResourceFilesApi;
  trackFile: (path: string) => void;
  trackedFiles: string[];
}

export interface LinkerResult {
  didChange?: boolean;
  meta?: Record<string, any>;
  caches?: Record<string, any>;
}

export interface LinkerHandlerApi {
  build: BuildConfig;
  config: IIIFRC;
  resource: any;
  builder: IIIFBuilder;
  helpers: LinkerHelpers;
  prepared?: any;
  preparedAll?: LinkerPreparedData<any>;
  prepareHash?: string;
  meta: LazyValue<Record<string, any>>;
  caches: LazyValue<Record<string, any>>;
  filesDir: string;
  fileHandler: FileHandler;
  resourceFiles: ResourceFilesApi;
  trackFile: (path: string) => void;
  trackedFiles: string[];
}

export interface Linker<Config = any> {
  id: string;
  name: string;
  types: string[];
  prepare?: (api: LinkerPrepareApi, config: Config) => Promise<void | LinkerPreparedData<any>>;
  configure?: (api: LinkerSetupApi, config: Partial<Config>) => Promise<Config>;
  invalidate?: (resource: ActiveResourceJson, api: LinkerInvalidateApi, config: Config) => Promise<boolean>;
  handler: (resource: ActiveResourceJson, api: LinkerHandlerApi, config: Config) => Promise<LinkerResult>;
}
