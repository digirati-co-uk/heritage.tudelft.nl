import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { test } from "node:test";
import { builtInScripts, run, stores } from "../iiif.config.js";

for (const file of await readdir(new URL("../scripts/", import.meta.url))) {
  await import(new URL(`../scripts/${file}`, import.meta.url));
}
const registry = globalThis.__hss;
const steps = Object.values(registry).flat();

test("every configured step belongs to Delft, with no duplicate IDs", () => {
  assert.equal(builtInScripts, false);
  assert.equal(new Set(steps.map((step) => step.id)).size, steps.length);
  for (const id of [
    ...run,
    ...Object.values(stores).flatMap((store) => store.run || []),
  ]) {
    assert.ok(
      steps.find((step) => step.id === id),
      `Missing local script: ${id}`,
    );
  }
});

test("search and related-object extraction handle absent metadata", async () => {
  const resource = { type: "Manifest", label: { en: ["Example"] } };
  const api = {
    resource,
    meta: { value: Promise.resolve({ thumbnail: { id: "image.jpg" } }) },
  };
  const search = steps.find((step) => step.id === "extract-search-record");
  const result = await search.handler(
    { slug: "manifests/example", type: "Manifest" },
    api,
    {},
  );
  assert.equal(result.search.record.plaintext, "");
  assert.equal(result.search.record.thumbnail, "image.jpg");
  const related = steps.find((step) => step.id === "delft-related");
  assert.deepEqual(await related.handler({}, api, {}), {});
});

test("runtime hints omit local filesystem paths", async () => {
  const step = steps.find((step) => step.id === "extract-runtime-hints");
  const result = await step.handler({
    type: "Manifest",
    source: { type: "disk", path: "/private/example.json" },
  });
  assert.deepEqual(result.meta["hss:runtime"], {
    type: "Manifest",
    source: { type: "disk" },
    saveToDisk: true,
  });
});
