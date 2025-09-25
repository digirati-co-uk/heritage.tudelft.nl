import fs from "node:fs";
import { cwd, env } from "node:process";
import type { Command } from "commander";
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
import { FileHandler } from "../util/file-handler.ts";
import { type BuildBuiltIns, getBuildConfig } from "../util/get-build-config.ts";
import type { Rewrite } from "../util/rewrite.ts";
import { parseStores } from "./build/0-parse-stores.ts";
import { loadStores } from "./build/1-load-stores.ts";
import { extract } from "./build/2-extract.ts";
import { enrich } from "./build/3-enrich.ts";
import { emit } from "./build/4-emit.ts";
import { indices } from "./build/5-indices.ts";
import { generateCommand } from "./generate.ts";

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
  ui?: boolean;

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
  // This is really slow, so we don't run it by default.
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

export const defaultBuiltIns: BuildBuiltIns = {
  defaultRun,
  rewrites: buildInRewrites,
  extractions: builtInExtractions,
  enrichments: buildInEnrichments,
  defaultCacheDir,
  defaultBuildDir,
  devCache,
  devBuild,
  topicFolder,
  storeTypes,
  env: {
    DEV_SERVER: env.DEV_SERVER,
    SERVER_URL: env.SERVER_URL,
  },
};

export async function buildCommand(options: BuildOptions, command?: Command) {
  const startTime = Date.now();
  await build({
    ui: true,
    ...options,
  });
  console.log("");
  console.log(`Done in ${Date.now() - startTime}ms`);
}

export async function build(
  options: BuildOptions,
  builtIns: BuildBuiltIns = defaultBuiltIns,
  {
    fileHandler = new FileHandler(fs, cwd(), true),
    pathCache = { allPaths: {} },
    storeRequestCaches,
  }: {
    fileHandler?: FileHandler;
    pathCache?: { allPaths: Record<string, string> };
    storeRequestCaches?: Record<string, any>;
  } = {}
) {
  const buildConfig = await getBuildConfig(
    {
      scripts: "./scripts",
      extract: true,
      enrich: true,
      dev: false,
      emit: true,
      ...options,
    },
    {
      ...builtIns,
      fileHandler,
    }
  );

  if (buildConfig.options.generate) {
    await generateCommand(buildConfig.options);
  }

  const { time } = buildConfig;

  await fs.promises.mkdir(buildConfig.cacheDir, { recursive: true });
  await fs.promises.mkdir(buildConfig.buildDir, { recursive: true });
  await fs.promises.mkdir(buildConfig.requestCacheDir, { recursive: true });

  // Parse stores.
  const parsed = await time(
    "Parsed stores",
    parseStores(buildConfig, { storeRequestCaches: storeRequestCaches || {} })
  );

  // Load stores.
  const stores = await time("Loaded stores", loadStores(parsed, buildConfig));

  pathCache.allPaths = { ...stores.allPaths };

  // Extract.
  const extractions = await time("Extracting resources", extract(stores, buildConfig));

  const enrichments = await time("Enriching resources", enrich(stores, buildConfig));

  const emitted = await time("Emitting files", emit(stores, buildConfig));

  await time(
    "Building indices",
    indices(
      {
        allResources: stores.allResources,
        editable: stores.editable,
        overrides: stores.overrides,
        collections: extractions.collections,
        manifestCollection: emitted.manifestCollection,
        storeCollections: emitted.storeCollections,
        indexCollection: emitted.indexCollection,
        siteMap: emitted.siteMap,
      },
      buildConfig
    )
  );

  await buildConfig.fileTypeCache.save();

  if (options.emit) {
    await fileHandler.saveAll();
  }

  return {
    emitted,
    enrichments,
    extractions,
    stores,
    parsed,
    buildConfig,
  };
}

export type BuildConfig = Awaited<ReturnType<typeof getBuildConfig>>;
