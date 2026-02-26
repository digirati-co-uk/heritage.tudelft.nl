import fs from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chdir, cwd } from "node:process";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { linker } from "../../lib/scripts.js";
import { build, defaultBuiltIns } from "../../src/commands/build.ts";
import { FileHandler } from "../../src/util/file-handler.ts";

describe("linker integration", () => {
  const originalCwd = cwd();
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "iiif-hss-linker-"));
    chdir(testDir);
    (global as any).__hss = undefined;
    await mkdir(join(testDir, "content"), { recursive: true });
    await writeFile(
      join(testDir, "content", "demo.json"),
      JSON.stringify(
        {
          id: "https://example.org/iiif/demo/manifest",
          type: "Manifest",
          label: { en: ["Demo"] },
          items: [],
        },
        null,
        2
      )
    );
  });

  afterEach(async () => {
    (global as any).__hss = undefined;
    chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  test("linker can write files and merge meta before extraction/enrichment", async () => {
    linker(
      {
        id: "demo-linker",
        name: "Demo linker",
        types: ["Manifest"],
      },
      async (resource, api) => {
        await api.resourceFiles.writeFile("linked/source.txt", "raw-linked-data");
        api.trackFile("./content/demo.json");
        return {
          meta: {
            linkedBy: "demo-linker",
            resourceId: resource.id,
          },
        };
      }
    );

    const customConfig = {
      run: ["demo-linker"],
      stores: {
        local: {
          type: "iiif-json" as const,
          path: "./content",
          pattern: "**/*.json",
        },
      },
      server: {
        url: "http://localhost:7111",
      },
    };

    const output = await build(
      {
        emit: true,
        cache: false,
        debug: false,
        ui: false,
      },
      defaultBuiltIns,
      {
        customConfig,
        fileHandler: new FileHandler(fs as any, testDir, false),
      }
    );

    expect(output.linked?.stats?.linked).toBe(1);
    const linkedResource = output.stores.allResources[0];
    expect(linkedResource?.slug).toBeDefined();

    const slug = linkedResource.slug;
    const metaPath = join(testDir, ".iiif/cache", slug, "meta.json");
    const linkedPath = join(testDir, ".iiif/cache", slug, "files", "linked", "source.txt");
    const linkerCachePath = join(testDir, ".iiif/cache", "_linkers", "demo-linker.json");

    const meta = JSON.parse(await readFile(metaPath, "utf-8"));
    const linkedContent = await readFile(linkedPath, "utf-8");
    const linkerCache = JSON.parse(await readFile(linkerCachePath, "utf-8"));

    expect(meta.linkedBy).toBe("demo-linker");
    expect(meta.resourceId).toBe("https://example.org/iiif/demo/manifest");
    expect(linkedContent).toBe("raw-linked-data");
    expect(linkerCache.resources[slug]).toBeDefined();
  });

  test("linker prepare can map raw data to manifest before per-resource handler", async () => {
    await mkdir(join(testDir, "raw"), { recursive: true });
    await writeFile(
      join(testDir, "raw", "annotations.json"),
      JSON.stringify(
        {
          manifest: "https://example.org/iiif/demo/manifest",
          annotationIds: ["anno-1", "anno-2"],
        },
        null,
        2
      )
    );

    linker(
      {
        id: "prepare-linker",
        name: "Prepare linker",
        types: ["Manifest"],
        prepare: async (api) => {
          api.trackFile("./raw/annotations.json");
          const raw = JSON.parse(await readFile(join(testDir, "raw", "annotations.json"), "utf-8"));
          return {
            byResourceId: {
              [raw.manifest]: raw,
            },
          };
        },
      },
      async (_resource, api) => {
        if (!api.prepared) {
          return {};
        }
        await api.resourceFiles.writeFile("linked/prepare.json", JSON.stringify(api.prepared, null, 2));
        return {
          meta: {
            preparedAnnotations: api.prepared.annotationIds.length,
          },
        };
      }
    );

    const customConfig = {
      run: ["prepare-linker"],
      stores: {
        local: {
          type: "iiif-json" as const,
          path: "./content",
          pattern: "**/*.json",
        },
      },
      server: {
        url: "http://localhost:7111",
      },
    };

    const output = await build(
      {
        emit: true,
        cache: false,
        debug: false,
        ui: false,
      },
      defaultBuiltIns,
      {
        customConfig,
        fileHandler: new FileHandler(fs as any, testDir, false),
      }
    );

    expect(output.linked?.stats?.linked).toBe(1);
    const slug = output.stores.allResources[0].slug;
    const preparedPath = join(testDir, ".iiif/cache", slug, "files", "linked", "prepare.json");
    const metaPath = join(testDir, ".iiif/cache", slug, "meta.json");

    const prepared = JSON.parse(await readFile(preparedPath, "utf-8"));
    const meta = JSON.parse(await readFile(metaPath, "utf-8"));

    expect(prepared.annotationIds).toEqual(["anno-1", "anno-2"]);
    expect(meta.preparedAnnotations).toBe(2);
  });

  test("linker cache skips unchanged tracked inputs", async () => {
    linker(
      {
        id: "demo-linker",
        name: "Demo linker",
        types: ["Manifest"],
      },
      async (_resource, api) => {
        api.trackFile("./content/demo.json");
        return {
          meta: {
            linkedBy: "demo-linker",
          },
        };
      }
    );

    const customConfig = {
      run: ["demo-linker"],
      stores: {
        local: {
          type: "iiif-json" as const,
          path: "./content",
          pattern: "**/*.json",
        },
      },
      server: {
        url: "http://localhost:7111",
      },
    };

    const first = await build(
      {
        emit: true,
        cache: true,
        debug: false,
        ui: false,
      },
      defaultBuiltIns,
      {
        customConfig,
        fileHandler: new FileHandler(fs as any, testDir, false),
      }
    );

    const second = await build(
      {
        emit: true,
        cache: true,
        debug: false,
        ui: false,
      },
      defaultBuiltIns,
      {
        customConfig,
        fileHandler: new FileHandler(fs as any, testDir, false),
      }
    );

    expect(first.linked?.stats?.linked).toBe(1);
    expect(second.linked?.stats?.linked).toBe(0);
    expect(second.linked?.stats?.cacheHit).toBe(1);
  });
});
