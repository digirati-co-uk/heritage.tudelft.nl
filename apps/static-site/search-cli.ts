#!/usr/bin/env node

import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { cwd, exit } from "node:process";
import chalk from "chalk";
import cliProgress from "cli-progress";
import { Command } from "commander";
import Typesense from "typesense";

const IIIF_DIRECTORY = resolve(cwd(), "../iiif/.iiif/build");
const IIIF_SOURCE_DIRECTORY = resolve(cwd(), "../iiif");
const LOCK_FILE_PATH = resolve(cwd(), "search-lock.yaml");

// Environment configuration
const TYPESENSE_API_KEY = process.env.TYPESENSE_API_KEY || "xyz";
const TYPESENSE_HOST = process.env.TYPESENSE_HOST || "localhost";
const TYPESENSE_PORT = process.env.TYPESENSE_PORT
  ? Number.parseInt(process.env.TYPESENSE_PORT)
  : 8108;
const TYPESENSE_PROTOCOL = process.env.TYPESENSE_PROTOCOL || "http";
const MANIFESTS_INDEX_NAME =
  process.env.TYPESENSE_COLLECTION_NAME || "manifests";
const CACHE_INDEX_NAME =
  process.env.TYPESENSE_CACHE_COLLECTION_NAME || "search-cache";

export const typesenseServerConfig = {
  apiKey: TYPESENSE_API_KEY,
  nodes: [
    {
      host: TYPESENSE_HOST,
      port: TYPESENSE_PORT,
      protocol: TYPESENSE_PROTOCOL,
    },
  ],
  connectionTimeoutSeconds: 10,
};

const client = new Typesense.Client(typesenseServerConfig);

interface Logger {
  info: (message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warn: (message: string) => void;
  debug: (message: string) => void;
}

function createLogger(isCI = false): Logger {
  if (isCI) {
    return {
      info: (msg) => console.log(msg),
      success: (msg) => console.log(`✓ ${msg}`),
      error: (msg) => console.error(`✗ ${msg}`),
      warn: (msg) => console.warn(`⚠ ${msg}`),
      debug: (msg) => console.log(`• ${msg}`),
    };
  }

  return {
    info: (msg) => console.log(chalk.blue(msg)),
    success: (msg) => console.log(chalk.green(`✓ ${msg}`)),
    error: (msg) => console.error(chalk.red(`✗ ${msg}`)),
    warn: (msg) => console.warn(chalk.yellow(`⚠ ${msg}`)),
    debug: (msg) => console.log(chalk.gray(`• ${msg}`)),
  };
}

async function readJsonFile(path: string): Promise<any> {
  try {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read JSON file ${path}: ${error}`);
  }
}

async function indexManifests(options: {
  recreate?: boolean;
  allowErrors?: boolean;
  silent?: boolean;
}): Promise<void> {
  const logger = createLogger(options.silent);

  logger.info("Starting manifest indexing...");

  if (!existsSync(join(IIIF_DIRECTORY, "meta/search/manifests.schema.json"))) {
    logger.error("Manifest schema file not found");
    exit(1);
  }

  const schema = await readJsonFile(
    join(IIIF_DIRECTORY, "/meta/search/manifests.schema.json"),
  );
  const data = await readFile(
    join(IIIF_DIRECTORY, "/meta/search/manifests.jsonl"),
    "utf-8",
  );

  const jsonDocuments = data
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));

  const collections = await client.collections().retrieve();
  const manifestsCollection = collections.find(
    (c) => c.name === MANIFESTS_INDEX_NAME,
  );
  const needsRecreation = !manifestsCollection || options.recreate;

  if (manifestsCollection && options.recreate) {
    logger.info(`Recreating collection '${MANIFESTS_INDEX_NAME}'`);
    await client.collections(MANIFESTS_INDEX_NAME).delete();
  }

  // Handle exhibitions
  const exhibitionsPath = join(
    cwd(),
    "../iiif",
    "manifests",
    "manifest-editor",
    "exhibitions",
  );
  const exhibitions = existsSync(exhibitionsPath)
    ? (await readdir(exhibitionsPath)).map(
        (name: string) => `manifests/${name.replace(".json", "")}`,
      )
    : [];

  const processedDocuments = jsonDocuments.map((document: any) => {
    if (exhibitions.includes(document.slug)) {
      return {
        ...document,
        slug: document.slug.replace("manifests/", "exhibitions/"),
        type: "Exhibition",
      };
    }
    if (document.slug.includes("manifests/")) {
      return {
        ...document,
        slug: document.slug.replace("manifests/", "objects/"),
        type: "Object",
      };
    }
    return document;
  });

  if (needsRecreation) {
    schema.name = MANIFESTS_INDEX_NAME;
    logger.info(`Creating collection '${MANIFESTS_INDEX_NAME}'`);
    await client.collections().create(schema);
  }

  try {
    await client
      .collections(MANIFESTS_INDEX_NAME)
      .documents()
      .import(processedDocuments, { action: "upsert" });
  } catch (err: any) {
    logger.error("Import failed");

    if (err.importResults) {
      const failedDocuments = err.importResults.filter(
        (result: any) => result.success === false,
      );

      for (const failed of failedDocuments) {
        const doc = JSON.parse(failed.document);
        logger.error(
          `Failed to import ${doc.type} ${doc.slug}: ${failed.error}`,
        );
      }

      if (!options.allowErrors) {
        throw new Error("Import failed with errors");
      }
    }
  }

  logger.success(
    `Imported ${jsonDocuments.length} documents into '${MANIFESTS_INDEX_NAME}' collection`,
  );

  // Handle publications
  try {
    const { allPublications } = await import(
      "./.contentlayer/generated/index.mjs"
    );

    if (allPublications?.length) {
      const publicationDocs = allPublications.map((publication: any) => ({
        id: `${publication.lang}/${publication.id}`,
        label: publication.title,
        type: "Publication",
        thumbnail: publication.image,
        slug: `publications/${publication.id}`,
        plaintext: publication.body?.raw || "",
      }));

      await client
        .collections(MANIFESTS_INDEX_NAME)
        .documents()
        .import(publicationDocs, { action: "upsert" });

      logger.success(
        `Imported ${publicationDocs.length} publications into '${MANIFESTS_INDEX_NAME}' collection`,
      );
    }
  } catch (error) {
    logger.debug("No publications found or failed to import publications");
  }
}

async function showStatus(options: { silent?: boolean }): Promise<void> {
  const logger = createLogger(options.silent);

  try {
    const collections = await client.collections().retrieve();

    logger.info("Typesense Collections Status:");
    logger.info(`Host: ${TYPESENSE_HOST}:${TYPESENSE_PORT}`);
    logger.info("");

    for (const collection of collections) {
      const stats = await client.collections(collection.name).retrieve();
      logger.info(`${collection.name}: ${stats.num_documents} documents`);
    }
  } catch (error) {
    logger.error(`Failed to get status: ${error}`);
    exit(1);
  }
}

async function importCanvasData(options: {
  manifest: string;
  url?: string;
  file?: string;
  silent?: boolean;
  pretty?: boolean;
}) {
  const logger = createLogger(options.silent);

  let resultsObject = null;

  const filePath = join(IIIF_SOURCE_DIRECTORY, options.manifest);
  if (!existsSync(filePath)) {
    logger.error(`File ${filePath} does not exist`);
    exit(1);
  }

  if (options.url) {
    const indexFile = await fetch(options.url).then((r) => r.json());
    resultsObject = indexFile.result || indexFile; // support either.
  }

  if (options.file) {
    const fileContent = await readFile(options.file, "utf8");
    const results = JSON.parse(fileContent);
    resultsObject = results.result || results;
  }

  if (!resultsObject) {
    logger.error("No results found");
    exit(1);
  }

  console.log(Object.keys(resultsObject));

  if (!resultsObject.canvases) {
    logger.error("No canvases found in results");
    exit(1);
  }

  // manifests/collective-access/objects/81838beb-788e-4f41-820c-cecae2746733.json
  const canvasesDirectory = join(
    filePath.slice(0, filePath.length - ".json".length),
    "canvases",
  );

  // Make the canvases directory.
  await mkdir(canvasesDirectory, { recursive: true });

  const progressBar = options.silent
    ? null
    : new cliProgress.SingleBar({
        format: `Indexing |${chalk.cyan("{bar}")}| {percentage}% | {value}/{total} manifests`,
        barCompleteChar: "\u2588",
        barIncompleteChar: "\u2591",
        hideCursor: true,
      });

  if (!options.silent) {
    progressBar?.start(resultsObject.canvases.length, 0);
  }

  for (let i = 0; i < resultsObject.canvases.length; i++) {
    const canvasIdx = i;
    const canvas = resultsObject.canvases[i];
    await mkdir(join(canvasesDirectory, `${canvasIdx}`), { recursive: true });
    await writeFile(
      join(canvasesDirectory, `${canvasIdx}/ocr.json`),
      JSON.stringify(canvas, null, options.pretty ? 2 : undefined),
    );
    if (!options.silent) {
      progressBar?.increment();
    }
  }

  if (!options.silent) {
    progressBar?.stop();
  }

  logger.success(`Imported ${resultsObject.canvases.length} canvases`);
}

// CLI Setup
const program = new Command();

program
  .name("search-cli")
  .description("Heritage TU Delft Search Indexing CLI")
  .version("1.0.0");

program
  .command("index-manifests")
  .description("Index manifests and publications into Typesense")
  .option("--recreate", "Recreate the index from scratch", false)
  .option(
    "--allow-errors",
    "Continue indexing even if some documents fail",
    false,
  )
  .option("--silent", "Run in CI mode with minimal output", false)
  .action(async (options) => {
    try {
      await indexManifests(options);
      exit(0);
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      exit(1);
    }
  });

program
  .command("status")
  .description("Show indexing status and collection information")
  .option("--silent", "Run in CI mode with minimal output", false)
  .action(async (options) => {
    try {
      await showStatus(options);
      exit(0);
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      exit(1);
    }
  });

program
  .command("import <manifest>")
  .description("Import canvas OCR from a JSON file")
  .option("--url <url>", "URL to the JSON file")
  .option("--file <file>", "Path to the JSON file")
  .option("--silent", "Run in CI mode with minimal output", false)
  .option("--pretty", "Pretty print the output", false)
  .action(async (manifest, options) => {
    try {
      await importCanvasData({ manifest, ...options });
      exit(0);
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      exit(1);
    }
  });

program
  .command("clean")
  .description("Clean up lock file and cache collection")
  .option("--silent", "Run in CI mode with minimal output", false)
  .action(async (options) => {
    const logger = createLogger(options.silent);

    try {
      // Delete cache collection
      try {
        await client.collections(CACHE_INDEX_NAME).delete();
        logger.success(`Deleted cache collection '${CACHE_INDEX_NAME}'`);
      } catch (error) {
        logger.debug(`Cache collection '${CACHE_INDEX_NAME}' not found`);
      }

      // Delete lock file
      if (existsSync(LOCK_FILE_PATH)) {
        await readFile(LOCK_FILE_PATH); // Check if readable
        // Note: We're not actually deleting the file since it might contain important data
        logger.info(`Lock file exists at: ${LOCK_FILE_PATH}`);
        logger.info(
          "To reset lock file, delete it manually and run indexing again",
        );
      } else {
        logger.info("No lock file found");
      }

      exit(0);
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      exit(1);
    }
  });

// Handle unhandled errors
process.on("unhandledRejection", (error) => {
  console.error(chalk.red(`Unhandled error: ${error}`));
  exit(1);
});

// Parse CLI arguments
program.parse();
