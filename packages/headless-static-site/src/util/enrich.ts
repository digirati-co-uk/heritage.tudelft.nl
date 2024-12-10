import type { LazyValue } from "./lazy-value";
import type { IIIFRC } from "./get-config";
import type { IIIFBuilder } from "@iiif/builder";
import type { ActiveResourceJson } from "./store";
import type { BuildConfig } from "../commands/build.ts";
import type { createStoreRequestCache } from "./store-request-cache.ts";

export interface EnrichmentHandlerApi {
  meta: LazyValue<Record<string, any>>;
  indices: LazyValue<Record<string, any>>;
  caches: LazyValue<Record<string, any>>;
  config: IIIFRC;
  builder: IIIFBuilder;
  resource: any;
  files: string;
  requestCache: ReturnType<typeof createStoreRequestCache>;
}

interface EnrichmentInvalidateApi {
  config: IIIFRC;
  resource: any;
  caches: LazyValue<Record<string, any>>;
  files: string;
}

export interface EnrichmentResult<Temp = any> {
  temp?: Temp;
  didChange?: boolean;
  meta?: Record<string, any>;
  indices?: Record<string, any>;
  caches?: Record<string, any>;
  collections?: string[];
}

export interface EnrichmentSetupApi {
  build: BuildConfig;
  config: IIIFRC;
}

export interface Enrichment<Config = any, Temp = any> {
  id: string;
  name: string;
  types: string[];
  close?: (config: Config) => Promise<void>;
  collect?: (
    temp: Record<string, Temp>,
    api: EnrichmentSetupApi,
    config: Partial<Config>,
  ) => Promise<void>;
  configure?: (
    api: EnrichmentSetupApi,
    config: Partial<Config>,
  ) => Promise<Config>;
  invalidate: (
    resource: ActiveResourceJson,
    api: EnrichmentInvalidateApi,
    config: Config,
  ) => Promise<boolean>;
  handler(
    resource: ActiveResourceJson,
    api: EnrichmentHandlerApi,
    config: Config,
  ): Promise<EnrichmentResult<Temp>>;
}
