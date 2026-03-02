import { describe, expect, test } from "vitest";
import { extractFolderCollections } from "../../src/extract/extract-folder-collections.ts";

describe("extractFolderCollections", () => {
  test("collects disk relative path by default", async () => {
    const result = await extractFolderCollections.handler(
      {
        source: {
          type: "disk",
          relativePath: "folder/subfolder",
        },
      } as any,
      {} as any,
      {}
    );

    expect(result.collections).toEqual(["folder/subfolder"]);
  });

  test("respects minDepth and ignorePaths", async () => {
    const shallow = await extractFolderCollections.handler(
      {
        source: {
          type: "disk",
          relativePath: "single",
        },
      } as any,
      {} as any,
      {
        minDepth: 2,
      }
    );
    expect(shallow.collections).toBeUndefined();

    const ignored = await extractFolderCollections.handler(
      {
        source: {
          type: "disk",
          relativePath: "foo/bar",
        },
      } as any,
      {} as any,
      {
        ignorePaths: ["foo/**"],
      }
    );
    expect(ignored.collections).toBeUndefined();
  });
});
