import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { create } from "../../src/dev/node-client.ts";

describe("node-client slug helper", () => {
  let testDir = "";

  afterEach(async () => {
    if (testDir) {
      await rm(testDir, { recursive: true, force: true });
      testDir = "";
    }
  });

  test("initializes slug helper on first urlToSlug call", async () => {
    testDir = await mkdtemp(join(tmpdir(), "iiif-hss-node-client-"));
    await mkdir(join(testDir, "config"), { recursive: true });
    await writeFile(
      join(testDir, "config", "slugs.json"),
      JSON.stringify(
        {
          manifest: {
            type: "Manifest",
            domain: "example.org",
            prefix: "/iiif/",
            suffix: ".json",
          },
        },
        null,
        2
      )
    );

    const client = create(testDir);
    const slug = await client.urlToSlug("https://example.org/iiif/demo.json", "Manifest");

    expect(slug).toEqual(["manifests/demo", "manifest"]);
  });
});
