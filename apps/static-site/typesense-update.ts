import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import Typesense from "typesense";
import { allPublications } from "contentlayer/generated";
import { join, resolve } from "node:path";
import { argv, cwd } from "node:process";

const TYPESENSE_API_KEY = process.env["TYPESENSE_API_KEY"] || "xyz";
const TYPESENSE_HOST = process.env["TYPESENSE_HOST"] || "localhost";
const TYPESENSE_PORT = process.env["TYPESENSE_PORT"] ? parseInt(process.env["TYPESENSE_PORT"]) : 8108;
const TYPESENSE_PROTOCOL = process.env["TYPESENSE_PROTOCOL"] || "http";
const INDEX_NAME = process.env["TYPESENSE_COLLECTION_NAME"] || "manifests";

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

const recreateIndex = argv.includes("--recreate-index");

const IIIF_DIRECTORY = resolve(cwd(), "../iiif/build");

async function readJsonFile(path: string) {
  return JSON.parse(await readFile(path, "utf-8"));
}

if (existsSync(join(IIIF_DIRECTORY, "meta/typesense/manifests.schema.json"))) {
  const schema = await readJsonFile(join(IIIF_DIRECTORY, "/meta/typesense/manifests.schema.json"));
  const data = (await readFile(join(IIIF_DIRECTORY, "/meta/typesense/manifests.jsonl"))).toString();

  const jsonDocuments = data.split("\n").map((line) => JSON.parse(line));

  const collections = await client.collections().retrieve();
  const manifestsCollection = collections.find((collection) => collection.name === INDEX_NAME);
  const needsRecreation = !manifestsCollection || recreateIndex;
  if (manifestsCollection && recreateIndex) {
    await client.collections(INDEX_NAME).delete();
  }

  const exhibitions = (await readdir(join(cwd(), "../iiif", "manifests", "exhibitions"))).map(
    (name: string) => `manifests/${name.replace(".json", "")}`
  );

  const processedDocuments = jsonDocuments.map((document: any) => {
    if (exhibitions.includes(document.slug)) {
      return {
        ...document,
        type: "Exhibition",
      };
    }

    return document;
  });

  if (needsRecreation) {
    schema.name = INDEX_NAME;
    console.log("Creating collection", INDEX_NAME);
    await client.collections().create(schema);
  }
  await client.collections(INDEX_NAME).documents().import(processedDocuments, { action: "upsert" });

  console.log(`Imported ${jsonDocuments.length} documents into the '${INDEX_NAME}' collection`);

  if (allPublications.length) {
    // @todo import publications
    const jsonDocuments: any[] = [];
    for (const publication of allPublications) {
      jsonDocuments.push({
        id: publication.id,
        label: publication.title,
        type: "publication",
        thumbnail: publication.image,
        slug: `publications/${publication.id}`,
        plaintext: publication.body.raw,
      });

      await client.collections(INDEX_NAME).documents().import(jsonDocuments, { action: "upsert" });
    }
    console.log(`Imported ${jsonDocuments.length} publications into the '${INDEX_NAME}' collection`);
  }
}
