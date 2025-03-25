import { describe, expect, test } from "vitest";

describe("auto slug test", () => {
  test("can create a slug from multiple examples", () => {
    function createAutoSlug(
      samples: string[],
      { idSeparator = "-", slugPrefix = "manifests/" }: { idSeparator?: string; slugPrefix?: string } = {}
    ) {
      // Find a prefix common to ALL samples
      const parts = samples.map((s) => s.split("/"));
      const prefixParts = [];

      for (let i = 0; i < parts[0].length; i++) {
        const firstPart = parts[0][i];
        const allPartsMatch = parts.every((p) => {
          return p[i] === firstPart;
        });
        if (!allPartsMatch) {
          break;
        }
        prefixParts.push(firstPart);
      }

      const suffixParts = [];
      for (let i = parts[0].length - 1; i >= 0; i--) {
        const lastPart = parts[0][i];
        const allPartsMatch = parts.every((p) => {
          return p[i] === lastPart;
        });
        if (!allPartsMatch) {
          break;
        }
        suffixParts.push(lastPart);
      }

      const maxSegments = Math.max(...parts.map((p) => p.length));
      const variableSegments = maxSegments - prefixParts.length - suffixParts.length;

      const prefix = prefixParts.join("/");
      const suffix = `/${suffixParts.reverse().join("/")}`;

      let startLetter = "a";

      // String.fromCharCode(c.charCodeAt(0) + 1)
      const variableParts = [];
      for (let i = 0; i < variableSegments; i++) {
        if (startLetter === "a") {
          variableParts.push(`:${startLetter}`);
        } else {
          variableParts.push(`:${startLetter}?`);
        }
        startLetter = String.fromCharCode(startLetter.charCodeAt(0) + 1);
      }

      return {
        prefix,
        pattern: `/${variableParts.join(idSeparator)}${suffix}`,
        slugTemplate: slugPrefix + variableParts.join(idSeparator),
      };
    }

    const examples = [
      "https://view.nls.uk/manifest/1204/4314/120443143/manifest.json",
      "https://view.nls.uk/manifest/1204/4310/120443102/manifest.json",
      "https://view.nls.uk/manifest/1156/3246/115632464/manifest.json",
      "https://view.nls.uk/manifest/1156/3246/115632468/manifest.json",
      "https://view.nls.uk/manifest/1196/2418/119624186/manifest.json",
      "https://view.nls.uk/manifest/1271/6299/127162994/manifest.json",
      "https://view.nls.uk/manifest/1156/3245/115632455/manifest.json",
      "https://view.nls.uk/manifest/1156/3246/115632466/manifest.json",
      "https://view.nls.uk/manifest/1156/3245/115632458/manifest.json",
    ];

    // expect(createAutoSlug(examples)).toMatchSnapshot();
    // expect(
    //   createAutoSlug([
    //     "https://view.nls.uk/nope/1156/3245/115632458/manifest.json",
    //     ...examples,
    //   ]),
    // ).toEqual("https://view.nls.uk/");
  });
});
