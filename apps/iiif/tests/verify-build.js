import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

const read = async (path) =>
  JSON.parse(
    await readFile(new URL(`../build/${path}`, import.meta.url), "utf8"),
  );
const manifests = await read("manifests/collection.json");
assert.ok(manifests.items.length > 0);
const slugs = manifests.items.map((item) => item["hss:slug"]);
assert.equal(new Set(slugs).size, slugs.length);
const records = (
  await readFile(
    new URL("../build/meta/search/manifests.jsonl", import.meta.url),
    "utf8",
  )
)
  .trim()
  .split("\n")
  .map(JSON.parse);
const manifestRecords = new Map(
  records
    .filter((record) => record.type === "Manifest")
    .map((record) => [record.slug, record]),
);
for (const slug of slugs) {
  const [manifest, meta] = await Promise.all([
    read(`${slug}/manifest.json`),
    read(`${slug}/meta.json`),
  ]);
  assert.equal(manifest["hss:slug"], slug);
  assert.equal(meta["hss:runtime"].saveToDisk, true);
  assert.ok(manifestRecords.has(slug), `Missing search record: ${slug}`);
  if (meta.thumbnail?.id)
    assert.equal(manifestRecords.get(slug).thumbnail, meta.thumbnail.id, slug);
}
for (const path of [
  "collections/site/collection.json",
  "collections/exhibitions/collection.json",
]) {
  const collection = await read(path);
  assert.ok(collection.items.length > 0, path);
  for (const item of collection.items)
    assert.ok(item["hss:slug"], `Missing item slug in ${path}`);
}
for (const file of ["related-objects.json", "image-service-links.json"]) {
  const mapping = await read(`meta/${file}`);
  for (const [slug, links] of Object.entries(mapping)) {
    assert.ok(manifestRecords.has(slug), `${file}: ${slug}`);
    for (const link of links)
      assert.ok(
        manifestRecords.has(typeof link === "string" ? link : link.slug),
        file,
      );
  }
}
const db = await open({
  filename: new URL("../build/meta/manifests.db", import.meta.url).pathname,
  driver: sqlite3.Database,
  mode: sqlite3.OPEN_READONLY,
});
const rows = await db.all("SELECT slug FROM manifests");
await db.close();
for (const row of rows)
  assert.ok(manifestRecords.has(row.slug), `Stale SQLite row: ${row.slug}`);
console.log(
  `Verified ${slugs.length} manifests, search records, collection links, related objects, and SQLite output.`,
);
