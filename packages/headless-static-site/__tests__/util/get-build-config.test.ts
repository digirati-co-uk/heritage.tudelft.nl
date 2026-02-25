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

  test("derives bounded queue concurrency defaults", async () => {
    const config = {
      stores: {
        local: {
          type: "iiif-json" as const,
          path: "./content",
        },
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

    expect(result.concurrency.link).toBeGreaterThanOrEqual(1);
    expect(result.concurrency.extract).toBeGreaterThanOrEqual(1);
    expect(result.concurrency.enrich).toBeGreaterThanOrEqual(1);
    expect(result.concurrency.emit).toBeGreaterThanOrEqual(1);
    expect(result.concurrency.emitCanvas).toBeGreaterThanOrEqual(1);
    expect(result.concurrency.write).toBeGreaterThanOrEqual(1);
  });

  test("applies explicit queue concurrency overrides", async () => {
    const config = {
      stores: {
        local: {
          type: "iiif-json" as const,
          path: "./content",
        },
      },
      concurrency: {
        cpu: 2,
        io: 5,
        extract: 3,
        enrichCanvas: 4,
        write: 7,
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

    expect(result.concurrency.link).toBe(2);
    expect(result.concurrency.extract).toBe(3);
    expect(result.concurrency.enrich).toBe(2);
    expect(result.concurrency.enrichCanvas).toBe(4);
    expect(result.concurrency.emit).toBe(5);
    expect(result.concurrency.emitCanvas).toBe(5);
    expect(result.concurrency.write).toBe(7);
  });
});
