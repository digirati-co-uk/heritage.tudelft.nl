import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chdir, cwd } from "node:process";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createFiletypeCache } from "../../src/util/file-type-cache";

describe("file type cache path handling", () => {
  const originalCwd = cwd();
  let testDir = "";

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "iiif-hss-file-type-"));
    chdir(testDir);
  });

  afterEach(async () => {
    chdir(originalCwd);
    if (testDir) {
      await rm(testDir, { recursive: true, force: true });
      testDir = "";
    }
  });

  test("detects type for absolute json path", async () => {
    const manifestPath = join(testDir, "absolute-manifest.json");
    await writeFile(
      manifestPath,
      JSON.stringify({
        id: "https://example.org/iiif/manifest/1",
        type: "Manifest",
      })
    );

    const cache = createFiletypeCache(join(testDir, "file-types.json"));
    const type = await cache.getFileType(manifestPath);

    expect(type).toBe("Manifest");
  });

  test("detects type for relative json path", async () => {
    const relativePath = "relative-collection.json";
    await writeFile(
      join(testDir, relativePath),
      JSON.stringify({
        id: "https://example.org/iiif/collection/1",
        type: "Collection",
      })
    );

    const cache = createFiletypeCache(join(testDir, "file-types.json"));
    const type = await cache.getFileType(relativePath);

    expect(type).toBe("Collection");
  });
});
