import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  IIIF_URL,
  loadCollection,
  loadManifest,
  loadMeta,
} from "../src/iiif.ts";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("missing IIIF resources return null", async () => {
  globalThis.fetch = async () => new Response("Not found", { status: 404 });
  assert.equal((await loadCollection("missing")).collection, null);
  assert.equal((await loadManifest("missing")).manifest, null);
});

test("a missing metadata file does not hide an existing manifest", async () => {
  globalThis.fetch = async (url) =>
    String(url).endsWith("meta.json")
      ? new Response("Not found", { status: 404 })
      : Response.json({ type: "Manifest", id: "https://example.org/manifest" });
  const result = await loadManifest("manifests/example");
  assert.equal(result.manifest.type, "Manifest");
  assert.deepEqual(result.meta, {});
});

test("global metadata uses the configured IIIF base without a doubled slash", async () => {
  globalThis.fetch = async (url) => {
    assert.equal(url, `${IIIF_URL}meta/image-service-links.json`);
    return Response.json({});
  };
  assert.deepEqual(await loadMeta("image-service-links.json"), {});
});
