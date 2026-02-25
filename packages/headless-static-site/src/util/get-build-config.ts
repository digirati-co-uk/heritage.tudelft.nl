import fs from "node:fs";
import { join } from "node:path";
import { cwd as nodeCwd } from "node:process";
// @ts-ignore
import { ImageServiceLoader } from "@atlas-viewer/iiif-image-api";
import chalk from "chalk";
import { IIIFJSONStore } from "../stores/iiif-json";
import { IIIFRemoteStore } from "../stores/iiif-remote";
import { combineSearchConfigs } from "./combine-search-configs";
import type { Enrichment } from "./enrich";
import type { Extraction } from "./extract";
import { FileHandler } from "./file-handler";
import { createFiletypeCache } from "./file-type-cache";
import { type IIIFRC, type ResolvedConfigSource, getCustomConfigSource, resolveConfigSource } from "./get-config";
import { getNodeGlobals } from "./get-node-globals";
import type { Linker } from "./linker";
import { loadScripts } from "./load-scripts";
import type { Rewrite } from "./rewrite";
import { compileSlugConfig } from "./slug-engine";
import type { Store } from "./store";
import { createStoreRequestCache } from "./store-request-cache";
import { Tracer } from "./tracer";

export type BuildOptions = {
  cwd?: string;
  config?: string;
  cache?: boolean;
  exact?: string;
  watch?: boolean;
  debug?: boolean;
  scripts?: string;
  generate?: boolean;
  stores?: string[];
  dev?: boolean;
  validate?: boolean;
  extract?: boolean;
  enrich?: boolean;
  emit?: boolean;
  skipFirstBuild?: boolean;
  client?: boolean;
  html?: boolean;
  python?: boolean;
  topics?: boolean;
  out?: string;
  ui?: boolean;
  remoteRecords?: boolean;

  // Programmatic only
  onBuild?: () => void | Promise<void>;
};

export interface BuildBuiltIns {
  defaultRun: string[];
  rewrites: Rewrite[];
  extractions: Extraction[];
  enrichments: Enrichment[];
  linkers: Linker[];

  defaultCacheDir: string;
  defaultBuildDir: string;
  devCache: string;
  devBuild: string;
  topicFolder: string;

  storeTypes: Record<string, Store<any>>;

  env?: {
    DEV_SERVER?: string;
    SERVER_URL?: string;
  };

  fileHandler?: FileHandler;
  tracer?: Tracer;
  customConfig?: IIIFRC;
  customConfigSource?: Omit<ResolvedConfigSource, "config">;
}

const storeTypes = {
  "iiif-json": IIIFJSONStore,
  "iiif-remote": IIIFRemoteStore,
};

export async function getBuildConfig(options: BuildOptions, builtIns: BuildBuiltIns) {
  const resolvedConfigSource = builtIns.customConfig
    ? ({
        ...getCustomConfigSource(builtIns.customConfig),
        ...(builtIns.customConfigSource || {}),
        config: builtIns.customConfig,
      } as ResolvedConfigSource)
    : await resolveConfigSource(options.config);
  const config = resolvedConfigSource.config;
  const env = builtIns.env || {};
  const cwd = options.cwd || nodeCwd();
  const { devBuild, defaultBuildDir, defaultCacheDir, devCache, topicFolder } = builtIns;

  const files = builtIns.fileHandler || new FileHandler(fs, cwd);

  const allRewrites = [...builtIns.rewrites];
  const allExtractions = [...builtIns.extractions];
  const allEnrichments = [...builtIns.enrichments];
  const allLinkers = [...builtIns.linkers];

  const cacheDir = options.dev ? devCache : defaultCacheDir;
  const buildDir = options.dev ? devBuild : options.out || defaultBuildDir;
  const filesDir = join(cacheDir, "files");

  const slugs = Object.fromEntries(
    Object.entries(config.slugs || {}).map(([key, value]) => {
      return [key, { info: value, compile: compileSlugConfig(value) }];
    })
  );

  const stores = Object.keys(config.stores).filter((s) => {
    if (!options.stores || options.stores.length === 0) return true;
    return options.stores.includes(s);
  });

  if (stores.length === 0) {
    if (options.stores && options.stores.length > 0) {
      throw new Error(`No stores found matching: ${options.stores.join(", ")}`);
    }
    throw new Error("No stores defined in config");
  }

  const defaultLogger = (...msg: any[]) => console.log(...msg);
  let internalLogger = defaultLogger;
  const log = (...args: any[]) => {
    options.debug && internalLogger(...args);
  };

  const setLogger = (logger: (...args: any[]) => void) => {
    internalLogger = logger;
  };

  const clearLogger = () => {
    internalLogger = defaultLogger;
  };

  const fileTypeCache = createFiletypeCache(join(cacheDir, "file-types.json"));

  const scriptsPath = options.scripts || resolvedConfigSource.defaultScriptsPath;
  await loadScripts({ ...options, scripts: scriptsPath, cwd }, log);
  const globals = getNodeGlobals();

  allExtractions.push(...globals.extractions);
  allEnrichments.push(...globals.enrichments);
  allLinkers.push(...globals.linkers);
  allRewrites.push(...globals.rewrites);

  log("Available extractions:", allExtractions.map((e) => e.id).join(", "));
  log("Available enrichments:", allEnrichments.map((e) => e.id).join(", "));
  log("Available linkers:", allLinkers.map((e) => e.id).join(", "));
  log("Available rewrites:", allRewrites.map((e) => e.id).join(", "));

  // We manually skip some.
  const toRun = config.run || builtIns.defaultRun;
  const rewrites = allRewrites.filter((e) => toRun.includes(e.id));
  const extractions = allExtractions.filter((e) => toRun.includes(e.id));
  const enrichments = allEnrichments.filter((e) => toRun.includes(e.id));
  const linkers = allLinkers.filter((e) => toRun.includes(e.id));

  const manifestRewrites = rewrites.filter((e) => e.types.includes("Manifest"));
  const collectionRewrites = rewrites.filter((e) => e.types.includes("Collection"));
  const manifestExtractions = extractions.filter((e) => e.types.includes("Manifest"));
  const collectionExtractions = extractions.filter((e) => e.types.includes("Collection"));
  const canvasExtractions = extractions.filter((e) => e.types.includes("Canvas"));

  const manifestEnrichment = enrichments.filter((e) => e.types.includes("Manifest"));
  const collectionEnrichment = enrichments.filter((e) => e.types.includes("Collection"));
  const canvasEnrichment = enrichments.filter((e) => e.types.includes("Canvas"));

  const requestCacheDir = join(cacheDir, "_requests");
  const virtualCacheDir = join(cacheDir, "_virtual");

  const server = options.dev ? { url: env.DEV_SERVER || "http://localhost:7111" } : env.SERVER_URL || config.server;

  const time = async <T>(label: string, promise: Promise<T>): Promise<T> => {
    const startTime = Date.now();
    const resp = await promise.catch((e) => {
      console.log("");
      console.log(chalk.red(e));
      console.log(e);
      process.exit(1);
    });
    log(chalk.blue(label) + chalk.grey(` (${Date.now() - startTime}ms)`));
    return resp;
  };

  const requestCache = createStoreRequestCache("_thumbs", requestCacheDir);
  const imageServiceLoader = new (class extends ImageServiceLoader {
    fetchService(serviceId: string): Promise<any & { real: boolean }> {
      return requestCache.fetch(serviceId);
    }
  })();

  const topicsDir = join(cwd, topicFolder);
  const configUrl = typeof server === "string" ? server : server?.url;
  const makeId = ({ type, slug }: { type: string; slug: string }) => {
    return `${configUrl}/${slug}/${type.toLowerCase()}.json`;
  };

  // Search.
  const searchIndexes = [];
  let defaultIndex = null;
  if (config.search) {
    for (const index of config.search.indexNames || []) {
      if (index === "manifest") {
        defaultIndex = "manifest";
      }
      const searchConfigs = [];
      for (const extraction of extractions) {
        if (extraction.search?.[index]) {
          searchConfigs.push(extraction.search[index]);
        }
      }
      for (const enrichment of enrichments) {
        if (enrichment.search?.[index]) {
          searchConfigs.push(enrichment.search[index]);
        }
      }
      if (searchConfigs.length) {
        searchIndexes.push(combineSearchConfigs(index, searchConfigs));
      }
    }
  }

  const search = {
    indexNames: config.search?.indexNames || defaultIndex ? [defaultIndex as string] : [],
    defaultIndex: config.search?.defaultIndex || defaultIndex,
    indexes: searchIndexes,
    emitRecord: config.search?.emitRecord || false,
  };

  const trace = builtIns.tracer || (options.dev ? new Tracer() : null);

  return {
    trace,
    files,
    options,
    server,
    configUrl,
    search,
    config,
    extractions,
    linkers,
    allRewrites,
    allExtractions,
    allEnrichments,
    allLinkers,
    canvasExtractions,
    manifestExtractions,
    collectionExtractions,
    manifestRewrites,
    collectionRewrites,
    enrichments,
    canvasEnrichment,
    manifestEnrichment,
    collectionEnrichment,
    requestCacheDir,
    virtualCacheDir,
    topicsDir,
    cacheDir,
    buildDir,
    filesDir,
    stores,

    // Helpers based on config.
    time,
    log,
    makeId,
    setLogger,
    clearLogger,
    slugs,
    imageServiceLoader,
    fileTypeCache,
    configSource: resolvedConfigSource,
    configMode: resolvedConfigSource.mode,
    configPath: resolvedConfigSource.configPath,
    configWatchPaths: resolvedConfigSource.watchPaths,
    resolvedScriptsPath: scriptsPath,
    // Currently hard-coded.
    storeTypes,
  };
}

export type BuildConfig = Awaited<ReturnType<typeof getBuildConfig>>;
