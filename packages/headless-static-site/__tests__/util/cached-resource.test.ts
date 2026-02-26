import { Vault } from "@iiif/helpers";
import { describe, expect, test } from "vitest";
import { createCacheResource } from "../../src/util/cached-resource";

function createFileHandlerMock() {
  const savedFiles: string[] = [];
  return {
    savedFiles,
    openJson: async () => ({}),
    loadJson: async () => ({}),
    saveJson: async (path: string) => {
      savedFiles.push(path);
    },
    mkdir: async () => undefined,
  };
}

describe("createCacheResource", () => {
  test("tracks didChange per resource instance", async () => {
    const fileHandler = createFileHandlerMock();
    const temp = {};
    const collections = {};

    const first = createCacheResource({
      resourcePath: "/tmp/resource-a",
      resource: {
        id: "https://example.org/resource-a",
        slug: "resource-a",
        vault: new Vault(),
      },
      temp,
      collections,
      fileHandler: fileHandler as any,
    });
    const second = createCacheResource({
      resourcePath: "/tmp/resource-b",
      resource: {
        id: "https://example.org/resource-b",
        slug: "resource-b",
        vault: new Vault(),
      },
      temp,
      collections,
      fileHandler: fileHandler as any,
    });

    first.handleResponse({ didChange: true }, { id: "first-step" });

    await first.saveVault();
    await second.saveVault();

    expect(fileHandler.savedFiles).toEqual(["/tmp/resource-a/vault.json"]);
  });
});
