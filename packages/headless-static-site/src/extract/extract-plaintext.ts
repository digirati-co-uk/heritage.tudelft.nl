import fs from "node:fs";
import { join } from "node:path";
import keywordExtractor from "keyword-extractor";
import type { Extraction } from "../util/extract";

type ExtractPlaintextConfig = {
  keywords: boolean;
};

export const extractPlaintext: Extraction<ExtractPlaintextConfig> = {
  id: "extract-plaintext",
  name: "Extract plaintext",
  types: ["Canvas"],
  invalidate: async () => {
    return true;
  },
  async collectManifest(manifest, temp, api, config) {
    if (temp.canvases) {
      const filesDir = join(api.build.cacheDir, manifest.slug, "files", "plaintext");
      const keywordsFile = join(api.build.cacheDir, manifest.slug, "files", "keywords.txt");
      await fs.promises.mkdir(filesDir, { recursive: true });

      const allText: string[] = [];

      for (const [canvasIdx, canvas] of Object.entries(temp.canvases || {})) {
        const text = (canvas as any).plaintext;
        if (text) {
          const canvasFile = join(filesDir, `${canvasIdx}.txt`);
          await fs.promises.mkdir(filesDir, { recursive: true });
          await fs.promises.writeFile(canvasFile, text);
          allText.push(text);
        }
      }

      const keywords = keywordExtractor
        .extract(allText.join(" "), {
          language: "en",
          remove_digits: true,
          return_changed_case: true,
          remove_duplicates: true,
        })
        .join(" ");

      if (config.keywords && keywords) {
        await fs.promises.writeFile(keywordsFile, keywords);
      }
    }
  },
  async handler(resource, api) {
    if (!api.resource.annotations.length) {
      return {};
    }

    const first = api.resource.annotations[0];

    const result = await api.requestCache.fetch(first.id);
    const plaintextLines = [];
    if (result?.items?.length) {
      for (const item of result.items) {
        if (item.body) {
          const body = Array.isArray(item.body) ? item.body[0] : item.body;
          if (body.type === "TextualBody" && typeof body.value === "string") {
            plaintextLines.push(body.value);
          }
        }
      }

      return {
        temp: {
          plaintext: plaintextLines.join("\n"),
        },
      };
    }

    return {};
  },
};
