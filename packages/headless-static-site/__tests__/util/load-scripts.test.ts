import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chdir, cwd } from "node:process";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { enrich } from "../../lib/scripts.js";
import { getNodeGlobals } from "../../src/util/get-node-globals";
import { getScriptImportSpecifier, loadScripts } from "../../src/util/load-scripts";

describe("loadScripts and global registration dedupe", () => {
  const originalCwd = cwd();
  let testDir = "";

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "iiif-hss-load-scripts-"));
    chdir(testDir);
    (global as any).__hss = undefined;
  });

  afterEach(async () => {
    (global as any).__hss = undefined;
    chdir(originalCwd);
    if (testDir) {
      await rm(testDir, { recursive: true, force: true });
      testDir = "";
    }
  });

  test("script import specifier changes when file content changes", async () => {
    const scriptsDir = join(testDir, "scripts");
    const scriptFile = join(scriptsDir, "custom.js");
    const libraryUrl = pathToFileURL(join(originalCwd, "lib", "scripts.js")).href;
    await mkdir(scriptsDir, { recursive: true });

    await writeFile(
      scriptFile,
      [
        `const { enrich } = await import(${JSON.stringify(libraryUrl)});`,
        `enrich({ id: "reload-enrich", name: "v1", types: ["Manifest"] }, async () => ({}));`,
      ].join("\n")
    );

    const firstSpecifier = await getScriptImportSpecifier(scriptFile);

    await new Promise((resolve) => setTimeout(resolve, 20));
    await writeFile(
      scriptFile,
      [
        `const { enrich } = await import(${JSON.stringify(libraryUrl)});`,
        `enrich({ id: "reload-enrich", name: "v2", types: ["Manifest"] }, async () => ({}));`,
      ].join("\n")
    );

    const secondSpecifier = await getScriptImportSpecifier(scriptFile);
    expect(secondSpecifier).not.toBe(firstSpecifier);
  });

  test("loads script registration and dedupes repeated loads by id", async () => {
    const scriptsDir = join(testDir, "scripts");
    const scriptFile = join(scriptsDir, "custom.js");
    const libraryUrl = pathToFileURL(join(originalCwd, "lib", "scripts.js")).href;
    await mkdir(scriptsDir, { recursive: true });

    await writeFile(
      scriptFile,
      [
        `const { enrich } = await import(${JSON.stringify(libraryUrl)});`,
        `enrich({ id: "reload-enrich", name: "v1", types: ["Manifest"] }, async () => ({}));`,
      ].join("\n")
    );

    await loadScripts({ scripts: "./scripts", cwd: testDir });
    await loadScripts({ scripts: "./scripts", cwd: testDir });

    const globals = getNodeGlobals();
    expect(globals.enrichments.length).toBe(1);
    expect(globals.enrichments[0].name).toBe("v1");
  });

  test("replaces duplicate registrations by id", () => {
    enrich(
      {
        id: "dedupe-enrich",
        name: "first",
        types: ["Manifest"],
      },
      async () => ({})
    );
    enrich(
      {
        id: "dedupe-enrich",
        name: "second",
        types: ["Manifest"],
      },
      async () => ({})
    );

    const globals = getNodeGlobals();
    expect(globals.enrichments.length).toBe(1);
    expect(globals.enrichments[0].name).toBe("second");
  });
});
