import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import Typesense from "typesense";
import { allPublications } from "contentlayer/generated";
import { join } from "node:path";
import { cwd } from "node:process";

const client = new Typesense.Client({
  nodes: [
    {
      host: "localhost",
      port: 8108,
      protocol: "http",
    },
  ],
  apiKey: "xyz",
  connectionTimeoutSeconds: 2,
});

async function readJsonFile(path: string) {
  return JSON.parse(await readFile(path, "utf-8"));
}

if (existsSync("./public/iiif/meta/typesense/manifests.schema.json")) {
  const schema = await readJsonFile("./public/iiif/meta/typesense/manifests.schema.json");
  const data = (await readFile("./public/iiif/meta/typesense/manifests.jsonl")).toString();

  const jsonDocuments = data.split("\n").map((line) => JSON.parse(line));

  const collections = await client.collections().retrieve();
  const manifestsCollection = collections.find((collection) => collection.name === "manifests");
  if (manifestsCollection) {
    await client.collections("manifests").delete();
  }

  const exhibitions = (await readdir(join(cwd(), "iiif", "manifests", "exhibitions"))).map(
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

  await client.collections().create(schema);
  await client.collections("manifests").documents().import(processedDocuments, { action: "upsert" });

  console.log(`Imported ${jsonDocuments.length} documents into the 'manifests' collection`);
}

if (existsSync("./public/iiif/meta/typesense/manifest-plaintext.schema.json")) {
  const schema = await readJsonFile("./public/iiif/meta/typesense/manifest-plaintext.schema.json");
  const data = (await readFile("./public/iiif/meta/typesense/manifest-plaintext.jsonl")).toString();

  const jsonDocuments = data.split("\n").map((line) => JSON.parse(line));

  const collections = await client.collections().retrieve();
  const manifestsCollection = collections.find((collection) => collection.name === "manifest-plaintext");
  if (manifestsCollection) {
    await client.collections("manifest-plaintext").delete();
  }

  await client.collections().create(schema);
  await client.collections("manifest-plaintext").documents().import(jsonDocuments, { action: "upsert" });

  console.log(`Imported ${jsonDocuments.length} documents into the 'manifest-plaintext' collection`);
}

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

    await client.collections("manifests").documents().import(jsonDocuments, { action: "upsert" });
  }
  console.log(`Imported ${jsonDocuments.length} publications into the 'manifests' collection`);
}
