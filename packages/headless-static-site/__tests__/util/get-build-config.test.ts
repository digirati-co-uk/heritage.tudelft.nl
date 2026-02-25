import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { defaultBuiltIns } from "../../src/commands/build";
import { getBuildConfig } from "../../src/util/get-build-config";

describe("getBuildConfig search indexNames", () => {
  let testDir: string;

  beforeEach(async () => {
    (global as any).__hss = undefined;
    testDir = await mkdtemp(join(tmpdir(), "iiif-hss-build-config-"));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    (global as any).__hss = undefined;
  });

  test("preserves explicit index names when defaultIndex is inferred", async () => {
    const config = {
      stores: {
        local: {
          type: "iiif-json" as const,
          path: "./content",
        },
      },
      search: {
        indexNames: ["manifest", "canvas"],
      },
    };

    const result = await getBuildConfig(
      {
        cwd: testDir,
        scripts: "./no-scripts-here",
      },
      {
        ...defaultBuiltIns,
        customConfig: config as any,
      }
    );

    expect(result.search.indexNames).toEqual(["manifest", "canvas"]);
  });

  test("preserves explicit index names when manifest is not present", async () => {
    const config = {
      stores: {
        local: {
          type: "iiif-json" as const,
          path: "./content",
        },
      },
      search: {
        indexNames: ["canvas"],
      },
    };

    const result = await getBuildConfig(
      {
        cwd: testDir,
        scripts: "./no-scripts-here",
      },
      {
        ...defaultBuiltIns,
        customConfig: config as any,
      }
    );

    expect(result.search.indexNames).toEqual(["canvas"]);
  });
});
