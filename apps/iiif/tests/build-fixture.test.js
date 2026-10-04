import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { test } from "node:test";
import * as config from "../iiif.config.js";

const exec = promisify(execFile);
test("cold IIIF build emits thumbnails, sidecars, runtime hints and search schema", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "delft-iiif-"));
  const json = (path) =>
    readFile(join(cwd, "build", path), "utf8").then(JSON.parse);
  try {
    await mkdir(join(cwd, "content/demo"), { recursive: true });
    await writeFile(
      join(cwd, "content/demo.json"),
      JSON.stringify({
        "@context": "http://iiif.io/api/presentation/3/context.json",
        id: "https://example.org/demo",
        type: "Manifest",
        label: { en: ["Demo"] },
        thumbnail: [
          {
            id: "https://example.org/image.jpg",
            type: "Image",
            width: 500,
            height: 500,
          },
        ],
        items: [],
      }),
    );
    await writeFile(
      join(cwd, "content/demo/schema.json"),
      JSON.stringify({ identifier: "demo" }),
    );
    await writeFile(
      join(cwd, ".iiifrc.yml"),
      JSON.stringify({
        ...config,
        server: { url: "https://example.org/iiif" },
        stores: {
          local: {
            type: "iiif-json",
            path: "./content",
            subFiles: true,
            pattern: "**/*.json",
          },
        },
      }),
    );
    const cli = fileURLToPath(
      new URL("./index.js", import.meta.resolve("iiif-hss/library")),
    );
    await exec(
      process.execPath,
      [
        cli,
        "build",
        "--out",
        "./build",
        "--scripts",
        fileURLToPath(new URL("../scripts", import.meta.url)),
      ],
      { cwd },
    );
    const meta = await json("manifests/demo/meta.json");
    const search = await json("manifests/demo/search-record.json");
    assert.equal(meta.thumbnail.id, "https://example.org/image.jpg");
    assert.equal(meta["hss:runtime"].saveToDisk, true);
    assert.equal(search.record.thumbnail, meta.thumbnail.id);
    assert.equal(search.record.identifier, "demo");
    const schema = await json("meta/search/manifests.schema.json");
    assert.ok(schema.fields.find((field) => field.name === "identifier"));
    const manifest = await json("manifests/demo/manifest.json");
    assert.ok(
      manifest.seeAlso.some((item) => item.id.endsWith("/schema.json")),
    );
    assert.equal((await json("meta/build.json")).mode, "full");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
