import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { indices } from "../../src/commands/build-steps/5-indices.ts";

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2));
}

describe("build indices", () => {
  let testDir = "";

  afterEach(async () => {
    if (!testDir) {
      return;
    }
    await rm(testDir, { recursive: true, force: true });
    testDir = "";
  });

  test("always writes topics/collection.json even when there are no extracted topics", async () => {
    testDir = await mkdtemp(join(tmpdir(), "iiif-hss-build-indices-"));
    const buildDir = join(testDir, ".iiif", "build");
    const cacheDir = join(testDir, ".iiif", "cache");
    const topicsDir = join(testDir, "content", "topics");

    const files = {
      async writeFile(path: string, content: string) {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, content);
      },
      async saveJson(path: string, content: unknown) {
        await writeJson(path, content);
      },
      async loadJson(path: string) {
        return JSON.parse(await readFile(path, "utf-8"));
      },
      async mkdir(path: string) {
        await mkdir(path, { recursive: true });
      },
      readYaml() {
        return {};
      },
    };

    await indices(
      {
        allResources: [],
        indexCollection: {},
        siteMap: {},
        allIndices: {},
        editable: {},
        overrides: {},
      },
      {
        options: {
          exact: undefined,
          stores: undefined,
          topics: false,
          debug: false,
        },
        server: "https://example.org/iiif",
        buildDir,
        cacheDir,
        topicsDir,
        collectionRewrites: [],
        files,
        config: {
          slugs: {},
          stores: {},
          collections: {},
        },
      } as any
    );

    const topicsCollection = JSON.parse(await readFile(join(buildDir, "topics", "collection.json"), "utf-8"));

    expect(topicsCollection.type).toBe("Collection");
    expect(topicsCollection["hss:slug"]).toBe("topics");
    expect(topicsCollection["hss:totalItems"]).toBe(0);
    expect(topicsCollection.items).toEqual([]);
  });
});
