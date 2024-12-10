import { join } from "node:path";
import { cwd } from "node:process";
// @ts-ignore
import { ImageServiceLoader } from "@atlas-viewer/iiif-image-api";
import { env } from "bun";
import chalk from "chalk";
import type { Command } from "commander";
import { mkdirp } from "mkdirp";
import { canvasThumbnail } from "../enrich/canvas-thumbnail.ts";
import { homepageProperty } from "../enrich/homepage-property";
import { manifestSqlite } from "../enrich/manifest-sqlite.ts";
import { translateMetadata } from "../enrich/translate-metadata.ts";
import { enrichTypesense } from "../enrich/typesense-index.ts";
import { typesensePlaintext } from "../enrich/typesense-plaintext.ts";
import { extractCanvasDims } from "../extract/extract-canvas-dims.ts";
import { extractFolderCollections } from "../extract/extract-folder-collections.ts";
import { extractLabelString } from "../extract/extract-label-string";
import { extractMetadataAnalysis } from "../extract/extract-metadata-analysis.ts";
import { extractPartOfCollection } from "../extract/extract-part-of-collection.ts";
import { extractPlaintext } from "../extract/extract-plaintext.ts";
import { extractRemoteSource } from "../extract/extract-remote-source.ts";
import { extractSlugSource } from "../extract/extract-slug-source";
import { extractThumbnail } from "../extract/extract-thumbnail.ts";
import { extractTopics } from "../extract/extract-topics.ts";
import { flatManifests } from "../rewrite/flat-manifests.ts";
import { IIIFJSONStore } from "../stores/iiif-json";
import { IIIFRemoteStore } from "../stores/iiif-remote";
import type { Enrichment } from "../util/enrich.ts";
import type { Extraction } from "../util/extract.ts";
import { createFiletypeCache } from "../util/file-type-cache.ts";
import { getConfig } from "../util/get-config";
import { getNodeGlobals } from "../util/get-node-globals";
import { loadScripts } from "../util/load-scripts.ts";
import type { Rewrite } from "../util/rewrite.ts";
import { compileSlugConfig } from "../util/slug-engine";
import { createStoreRequestCache } from "../util/store-request-cache.ts";
import { parseStores } from "./build/0-parse-stores.ts";
import { loadStores } from "./build/1-load-stores.ts";
import { extract } from "./build/2-extract.ts";
import { enrich } from "./build/3-enrich.ts";
import { emit } from "./build/4-emit.ts";
import { indices } from "./build/5-indices.ts";
import { generate } from "./generate.ts";
import { validate } from "./validate.ts";
// import { pdiiif } from "../enrich/pdiiif.ts";

export type BuildOptions = {
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

  // Programmatic only
  onBuild?: () => void | Promise<void>;
};

const defaultCacheDir = ".iiif/cache";
const defaultBuildDir = ".iiif/build";
const devCache = ".iiif/dev/cache";
const devBuild = ".iiif/dev/build";
const topicFolder = "content/topics";

const defaultRun = [
  extractRemoteSource.id,
  extractLabelString.id,
  extractSlugSource.id,
  homepageProperty.id,
  extractMetadataAnalysis.id,
  extractFolderCollections.id,
];

const buildInRewrites: Rewrite[] = [
  //
  flatManifests,
];

const builtInExtractions: Extraction[] = [
  extractLabelString,
  extractSlugSource,
  extractCanvasDims,
  extractThumbnail,
  extractTopics,
  extractMetadataAnalysis,
  extractRemoteSource,
  extractFolderCollections,
  extractPlaintext,
  extractPartOfCollection,
];
const buildInEnrichments: Enrichment[] = [
  homepageProperty,
  canvasThumbnail,
  translateMetadata,
  manifestSqlite,
  enrichTypesense,
  typesensePlaintext,
  // pdiiif
];

const builtInEnrichmentsMap = {
  [homepageProperty.id]: homepageProperty,
  [canvasThumbnail.id]: canvasThumbnail,
  [translateMetadata.id]: translateMetadata,
  // [pdiiif.id]: pdiiif,
};

const builtInExtractionsMap = {
  [extractLabelString.id]: extractLabelString,
  [extractSlugSource.id]: extractSlugSource,
  [extractCanvasDims.id]: extractCanvasDims,
};

const storeTypes = {
  "iiif-json": IIIFJSONStore,
  "iiif-remote": IIIFRemoteStore,
};

export async function build(options: BuildOptions, command?: Command) {
  const buildConfig = await getBuildConfig(options);
  const config = await getConfig();
  const { log, time } = buildConfig;
  const startTime = Date.now();

  if (options.validate) {
    await validate({}, command);
  }
  if (options.generate) {
    await generate({ cache: options.cache, debug: options.debug, scripts: options.scripts }, command);
  }

  await mkdirp(buildConfig.cacheDir);
  await mkdirp(buildConfig.buildDir);
  await mkdirp(buildConfig.requestCacheDir);

  const { storeResources, filesToWatch } = await time("Parsed stores", parseStores(buildConfig));

  if (!options.skipFirstBuild) {
    const {
      //
      allResources,
      editable,
      allPaths,
      overrides,
      rewrites,
      idsToSlugs,
    } = await time("Loaded stores", loadStores({ storeResources }, buildConfig));

    const { collections } = await time("Extracting resources", extract({ allResources }, buildConfig));

    await time("Enriching resources", enrich({ allResources }, buildConfig));

    const { storeCollections, manifestCollection, indexCollection, siteMap } = await time(
      "Emitting files",
      emit({ allResources, allPaths, idsToSlugs }, buildConfig)
    );

    await time(
      "Building indices",
      indices(
        {
          allResources,
          storeCollections,
          manifestCollection,
          indexCollection,
          editable,
          overrides,
          collections,
          siteMap,
        },
        buildConfig
      )
    );

    log("");
    console.log(`Done in ${Date.now() - startTime}ms`);
  }

  await buildConfig.fileTypeCache.save();

  if (options.watch) {
    // @todo This needs reworked to listen to the correct stores, not just the "content" directory.
    // const watcher = watch(join(cwd(), "content"), { recursive: true });
    // const { watch: _watch, scripts, cache, ...nonWatchOptions } = options;
    // for await (const event of watcher) {
    //   if (event.eventType === "change" && event.filename) {
    //     const file = join("content", event.filename);
    //     console.log(
    //       `Detected ${event.eventType} in ${event.filename} (${allPaths[file]})`,
    //     );
    //     await build({ ...nonWatchOptions, exact: allPaths[file] }, command);
    //     if (options.onBuild) {
    //       await options.onBuild();
    //     }
    //   }
    // }
  }
}

export async function getBuildConfig(options: BuildOptions) {
  const config = await getConfig();

  const allRewrites = [...buildInRewrites];
  const allExtractions = [...builtInExtractions];
  const allEnrichments = [...buildInEnrichments];

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
  const toRun = config.run || defaultRun;
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

  const topicsDir = join(cwd(), topicFolder);
  const configUrl = typeof server === "string" ? server : server?.url;
  const makeId = ({ type, slug }: { type: string; slug: string }) => {
    return `${configUrl}/${slug}/${type.toLowerCase()}.json`;
  };

  return {
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
