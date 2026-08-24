import { describe, expect, test } from "vitest";
import { makeGetSlugHelper } from "../../src/util/make-slug-helper.ts";

describe("makeGetSlugHelper default slug behavior", () => {
  test("removes trailing manifest.json from URL path", () => {
    const getSlug = makeGetSlugHelper({} as any, {} as any);
    const [slug] = getSlug({
      id: "https://iiif.io/api/cookbook/recipe/0001-mvm-image/manifest.json",
      type: "Manifest",
    });
    expect(slug).toBe("api/cookbook/recipe/0001-mvm-image");
  });

  test("removes trailing collection.json from URL path", () => {
    const getSlug = makeGetSlugHelper({} as any, {} as any);
    const [slug] = getSlug({
      id: "https://example.org/collections/demo/collection.json",
      type: "Collection",
    });
    expect(slug).toBe("collections/demo");
  });

  test("removes generic trailing .json when not manifest/collection filename", () => {
    const getSlug = makeGetSlugHelper({} as any, {} as any);
    const [slug] = getSlug({
      id: "https://example.org/cookbook-collection.json",
      type: "Collection",
    });
    expect(slug).toBe("cookbook-collection");
  });

  test("falls back to hostname when path collapses to empty", () => {
    const getSlug = makeGetSlugHelper({} as any, {} as any);
    const [slug] = getSlug({
      id: "https://example.org/manifest.json",
      type: "Manifest",
    });
    expect(slug).toBe("example.org");
  });
});
