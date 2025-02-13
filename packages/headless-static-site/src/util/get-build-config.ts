import fs from "node:fs";
import { join } from "node:path";
import { cwd as nodeCwd } from "node:process";
// @ts-ignore
import { ImageServiceLoader } from "@atlas-viewer/iiif-image-api";
import chalk from "chalk";
import { IIIFJSONStore } from "../stores/iiif-json";
import { IIIFRemoteStore } from "../stores/iiif-remote";
import type { Enrichment } from "./enrich";
import type { Extraction } from "./extract";
import { FileHandler } from "./file-handler";
import { createFiletypeCache } from "./file-type-cache";
import { getConfig } from "./get-config";
import { getNodeGlobals } from "./get-node-globals";
import { loadScripts } from "./load-scripts";
import type { Rewrite } from "./rewrite";
import { compileSlugConfig } from "./slug-engine";
import type { Store } from "./store";
import { createStoreRequestCache } from "./store-request-cache";

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

  // Programmatic only
  onBuild?: () => void | Promise<void>;
};

export interface BuildBuiltIns {
  defaultRun: string[];
  rewrites: Rewrite[];
  extractions: Extraction[];
  enrichments: Enrichment[];

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
}

const storeTypes = {
  "iiif-json": IIIFJSONStore,
  "iiif-remote": IIIFRemoteStore,
};

export async function getBuildConfig(options: BuildOptions, builtIns: BuildBuiltIns) {
  const config = await getConfig();
  const env = builtIns.env || {};
  const cwd = options.cwd || nodeCwd();
  const { devBuild, defaultBuildDir, defaultCacheDir, devCache, topicFolder } = builtIns;

  const files = builtIns.fileHandler || new FileHandler(fs, cwd);

  const allRewrites = [...builtIns.rewrites];
  const allExtractions = [...builtIns.extractions];
  const allEnrichments = [...builtIns.enrichments];

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

  await loadScripts(options, log);
  const globals = getNodeGlobals();

  allExtractions.push(...globals.extractions);
  allEnrichments.push(...globals.enrichments);
  allRewrites.push(...globals.rewrites);

  log("Available extractions:", allExtractions.map((e) => e.id).join(", "));
  log("Available enrichments:", allEnrichments.map((e) => e.id).join(", "));
  log("Available rewrites:", allRewrites.map((e) => e.id).join(", "));

  // We manually skip some.
  const toRun = config.run || builtIns.defaultRun;
  const rewrites = allRewrites.filter((e) => toRun.includes(e.id));
  const extractions = allExtractions.filter((e) => toRun.includes(e.id));
  const enrichments = allEnrichments.filter((e) => toRun.includes(e.id));

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

  return {
    files,
    options,
    server,
    configUrl,
    config,
    extractions,
    allRewrites,
    allExtractions,
    allEnrichments,
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
    // Currently hard-coded.
    storeTypes,
  };
}

export type BuildConfig = Awaited<ReturnType<typeof getBuildConfig>>;
