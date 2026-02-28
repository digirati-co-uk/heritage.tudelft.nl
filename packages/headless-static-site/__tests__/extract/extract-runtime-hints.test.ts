import { describe, expect, test } from "vitest";
import { extractRuntimeHints } from "../../src/extract/extract-runtime-hints.ts";

describe("extractRuntimeHints", () => {
  test("writes runtime hints to meta and caches", async () => {
    const result = await extractRuntimeHints.handler(
      {
        type: "Manifest",
        source: {
          type: "remote",
          url: "https://example.org/iiif/demo/manifest.json",
        },
      } as any,
      {} as any,
      {}
    );

    expect(result).toEqual({
      caches: {
        [extractRuntimeHints.id]:
          '{"type":"Manifest","source":{"type":"remote","url":"https://example.org/iiif/demo/manifest.json"},"saveToDisk":false}',
      },
      meta: {
        "hss:runtime": {
          type: "Manifest",
          source: {
            type: "remote",
            url: "https://example.org/iiif/demo/manifest.json",
          },
          saveToDisk: false,
        },
      },
    });
  });

  test("invalidates when cached runtime hints are missing or changed", async () => {
    const resource = {
      type: "Collection",
      source: {
        type: "disk",
        path: "./content",
        filePath: "content/demo.json",
      },
    } as any;

    const missingCache = await extractRuntimeHints.invalidate(
      resource,
      {
        caches: {
          value: Promise.resolve({}),
        },
      } as any,
      {}
    );

    const matchingCache = await extractRuntimeHints.invalidate(
      resource,
      {
        caches: {
          value: Promise.resolve({
            [extractRuntimeHints.id]:
              '{"type":"Collection","source":{"type":"disk","path":"./content","filePath":"content/demo.json"},"saveToDisk":true}',
          }),
        },
      } as any,
      {}
    );

    expect(missingCache).toBe(true);
    expect(matchingCache).toBe(false);
  });
});
