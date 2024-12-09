import { LazyValue } from './lazy-value';
import { ActiveResourceJson } from './store';
import { BuildConfig } from '../commands/build.ts';
import { IIIFRC } from './get-config.ts';
import { createStoreRequestCache } from './store-request-cache.ts';

export interface ExtractionInvalidateApi {
  caches: LazyValue<Record<string, any>>;
  resource: any;
  build: BuildConfig;
}

interface ExtractionSetupApi {
  build: BuildConfig;
  config: IIIFRC;
}

export interface ExtractionReturn<Temp = any> {
  temp?: Temp;
  caches?: Record<string, any>;
  meta?: any;
  indices?: Record<string, string[]>;
  collections?: string[];
  didChange?: never;
}

export interface Extraction<Config = any, Temp = any, TempInject = any> {
  id: string;
  name: string;
  types: string[];
  close?: (config: Config) => Promise<void>;
  collect?: (
    temp: Record<string, Temp>,
    api: ExtractionSetupApi,
    config: Partial<Config>
  ) => Promise<void | { temp: TempInject }>;
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
      config: IIIFRC;
      build: BuildConfig;
      requestCache: ReturnType<typeof createStoreRequestCache>;
    },
    config: Config
  ) => Promise<ExtractionReturn<Temp>>;
}
