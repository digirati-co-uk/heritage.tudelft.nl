import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { chdir, cwd } from "node:process";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mergeIiifConfig, resolveConfigSource } from "../../src/util/get-config";

async function write(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

describe("resolveConfigSource", () => {
  const originalCwd = cwd();
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "iiif-hss-config-"));
    chdir(testDir);
  });

  afterEach(async () => {
    chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  test("prefers .iiifrc.yml over iiif-config folder", async () => {
    await write(
      join(testDir, ".iiifrc.yml"),
      `
stores:
  from-file:
    type: iiif-json
    path: ./from-file
`
    );

    await write(
      join(testDir, "iiif-config/config.yml"),
      `
stores:
  from-folder:
    type: iiif-json
    path: ./from-folder
`
    );
    await write(
      join(testDir, "iiif-config/stores/remote.json"),
      `{"type":"iiif-remote","url":"https://example.org/manifest.json"}`
    );

    const result = await resolveConfigSource();
    expect(result.mode).toBe("file");
    expect(result.defaultScriptsPath).toBe("./scripts");
    expect(result.config.stores["from-file"]).toBeDefined();
    expect(result.config.stores["from-folder"]).toBeUndefined();
  });

  test("loads iiif-config stores and defaults _store path/base to manifests", async () => {
    await write(join(testDir, "iiif-config/config.yml"), "run: [demo-linker]\n");
    await write(join(testDir, "iiif-config/stores/local/_store.json"), `{"type":"iiif-json","pattern":"**/*.json"}`);

    const result = await resolveConfigSource();
    expect(result.mode).toBe("folder");
    expect(result.defaultScriptsPath).toBe("./iiif-config/scripts");

    const local = result.config.stores.local as any;
    expect(local.path.endsWith("/iiif-config/stores/local/manifests")).toBe(true);
    expect(local.base.endsWith("/iiif-config/stores/local/manifests")).toBe(true);
  });

  test("requires path for iiif-json stores declared as <name>.json", async () => {
    await write(join(testDir, "iiif-config/config.yml"), "");
    await write(join(testDir, "iiif-config/stores/local.json"), `{"type":"iiif-json"}`);

    await expect(resolveConfigSource()).rejects.toThrow('must include "path"');
  });

  test("maps iiif-config/config/*.json into config.config", async () => {
    await write(join(testDir, "iiif-config/config.yml"), "");
    await write(join(testDir, "iiif-config/stores/remote.json"), `{"type":"iiif-remote","url":"https://example.org"}`);
    await write(join(testDir, "iiif-config/config/my-linker.json"), `{"source":"./raw","enabled":true}`);

    const result = await resolveConfigSource();
    expect(result.mode).toBe("folder");
    expect(result.config.config?.["my-linker"]).toEqual({ source: "./raw", enabled: true });
  });

  test("falls back to default mode and default store when no config exists", async () => {
    const result = await resolveConfigSource();
    expect(result.mode).toBe("default");
    expect(result.config.stores.default).toBeDefined();
  });
});

describe("mergeIiifConfig", () => {
  test("deep merges nested config maps and keeps base sections", () => {
    const merged = mergeIiifConfig(
      {
        run: ["extract-topics"],
        stores: {
          fromFolder: {
            type: "iiif-json",
            path: "./content",
          },
        },
        slugs: {
          existing: {
            type: "Manifest",
            domain: "example.org",
          } as any,
        },
        config: {
          "extract-topics": {
            topicTypes: {
              date: ["Year"],
            },
          },
        },
      } as any,
      {
        config: {
          "extract-topics": {
            topicTypes: {
              contributor: ["Contributor", "Contributors"],
            },
          },
        },
      } as any
    );

    expect(merged.stores.fromFolder).toBeDefined();
    expect(merged.slugs?.existing).toBeDefined();
    expect(merged.config?.["extract-topics"]).toEqual({
      topicTypes: {
        date: ["Year"],
        contributor: ["Contributor", "Contributors"],
      },
    });
  });

  test("replaces arrays from inline overrides", () => {
    const merged = mergeIiifConfig(
      {
        run: ["metadata-analysis"],
        stores: {
          local: {
            type: "iiif-json",
            path: "./content",
            ignore: ["a", "b"],
          },
        },
      } as any,
      {
        run: ["extract-topics"],
        stores: {
          local: {
            ignore: ["c"],
          },
        },
      } as any
    );

    expect(merged.run).toEqual(["extract-topics"]);
    expect((merged.stores.local as any).ignore).toEqual(["c"]);
  });
});
