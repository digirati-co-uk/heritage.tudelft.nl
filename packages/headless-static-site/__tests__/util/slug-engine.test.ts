import { describe, expect, test } from "vitest";
import { SlugConfig, compileReverseSlugConfig, compileSlugConfig } from "../../src/util/slug-engine";

describe("slug-engine", () => {
  // New strategy.

  test("prefix/suffix/domain parsing", () => {
    const config = {
      type: "Manifest" as const,
      domain: "example.org",
      prefix: "/iiif/",
      suffix: ".json",
    };
    const compiled = compileSlugConfig(config);
    const reverse = compileReverseSlugConfig(config);

    const test1 = compiled("https://example.org/iiif/123.json");
    expect(test1).toEqual(["123", { path: "123" }]);

    const test2 = compiled("https://example.org/iiif/123");
    expect(test2).toEqual([null, null]);

    const test3 = compiled("https://example.org/iiif/123/456.json");
    expect(test3).toEqual(["123/456", { path: "123/456" }]);

    const testReverse = reverse("123");
    expect(testReverse[0]).toEqual("https://example.org/iiif/123.json");

    const testReverse2 = reverse("123/456");
    expect(testReverse2[0]).toEqual("https://example.org/iiif/123/456.json");
  });

  test("new parser with pathSeparator", () => {
    const config = {
      type: "Manifest" as const,
      domain: "example.org",
      prefix: "/iiif/",
      suffix: ".json",
      pathSeparator: "-",
    };

    const compiled = compileSlugConfig(config);
    const reverse = compileReverseSlugConfig(config);

    const test1 = compiled("https://example.org/iiif/123/456.json");
    expect(test1).toEqual(["123-456", { path: "123-456" }]);

    const reverseTest1 = reverse("123-456");
    expect(reverseTest1[0]).toEqual("https://example.org/iiif/123/456.json");
  });

  test("added prefix", () => {
    const config = {
      type: "Manifest" as const,
      domain: "example.org",
      prefix: "/iiif/",
      suffix: ".json",
      pathSeparator: "-",
      addedPrefix: "test-",
    };

    const compiled = compileSlugConfig(config);
    const reverse = compileReverseSlugConfig(config);

    const test1 = compiled("https://example.org/iiif/123/456.json");
    expect(test1).toEqual(["test-123-456", { path: "test-123-456" }]);

    const reverseTest1 = reverse("test-123-456");
    expect(reverseTest1[0]).toEqual("https://example.org/iiif/123/456.json");
  });
});
