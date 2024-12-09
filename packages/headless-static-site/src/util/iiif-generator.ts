import { LazyValue } from "./lazy-value.ts";
import { createStoreRequestCache } from "./store-request-cache.ts";

export type GeneratorReference<T = any> = {
  id: string;
  type: "Manifest" | "Collection";
  data: T;
};

type BaseApi<Config = any> = {
  config: Config;
  caches: LazyValue<Record<string, any>>;
  cacheDirectory: string;
  requestCache: ReturnType<typeof createStoreRequestCache>;
};

type GenerateApi<Config = any> = BaseApi<Config> & {
  builder: any;
  saveJson: (path: string, data: any) => void;
};

export interface IIIFGenerator<T = any, Config = any> {
  id: string;
  name: string;
  prepare(api: BaseApi): Promise<Array<GeneratorReference<T>>>;
  invalidateEach?: (
    resource: GeneratorReference<T>,
    api: BaseApi<Config>,
  ) => Promise<boolean>;
  invalidate?: (
    resources: Array<GeneratorReference<T>>,
    api: BaseApi<Config>,
  ) => Promise<boolean>;
  generateEach?: (
    resource: GeneratorReference<T>,
    directory: string,
    api: GenerateApi<Config> & { builder: any },
  ) => Promise<{ cache: any }>;
  generate?: (
    resources: Array<GeneratorReference<T>>,
    directory: string,
    api: GenerateApi<Config> & { builder: any },
  ) => Promise<{ cache: any; store?: any }>;
  postGenerate?: (
    resources: Array<GeneratorReference<T>>,
    directory: string,
    api: GenerateApi<Config>,
  ) => Promise<void>;
}
