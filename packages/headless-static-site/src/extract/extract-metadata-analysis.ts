import { join } from "node:path";
import type { DescriptiveProperties } from "@iiif/presentation-3";
import { mkdirp } from "mkdirp";
import type { Extraction } from "../util/extract.ts";
import { getSingleLabel } from "../util/get-single-label.ts";

type ExtractFormat = {
  foundKeys: string[];
  foundValues: Record<string, string[]>;
  foundValuesComma: Record<string, string[]>;
  foundLanguages: string[];
};

type ExtractionResult = {
  foundKeys: Record<string, number>;
  foundValues: Record<string, Record<string, number>>;
  foundValuesComma: Record<string, Record<string, number>>;
  foundLanguages: Record<string, number>;
  foundUniqueKeys: string[];
};

type ExtractionConfig = {
  language?: string;
  valueThreshold?: number;
  translate?: boolean;
};

export const extractMetadataAnalysis: Extraction<ExtractionConfig, ExtractFormat> = {
  id: "metadata-analysis",
  name: "Metadata Analysis",
  types: ["Manifest"],
  invalidate: async () => true,
  collect: async (temp, api, config) => {
    const { valueThreshold = 3 } = config || {};
    const analysisFile: ExtractionResult = {
      foundKeys: {},
      foundValues: {},
      foundValuesComma: {},
      foundLanguages: {},
      foundUniqueKeys: [],
    };

    const slugs = Object.keys(temp);
    for (const slug of slugs) {
      const result = temp[slug];
      for (const key of result.foundKeys) {
        if (!analysisFile.foundKeys[key]) {
          analysisFile.foundKeys[key] = 0;
        }
        analysisFile.foundKeys[key]++;
      }
      for (const key of Object.keys(result.foundValues)) {
        if (!analysisFile.foundValues[key]) {
          analysisFile.foundValues[key] = {};
        }
        for (const value of result.foundValues[key]) {
          if (!analysisFile.foundValues[key][value]) {
            analysisFile.foundValues[key][value] = 0;
          }
          analysisFile.foundValues[key][value]++;
        }
      }
      for (const key of Object.keys(result.foundValuesComma)) {
        if (!analysisFile.foundValuesComma[key]) {
          analysisFile.foundValuesComma[key] = {};
        }
        for (const value of result.foundValuesComma[key]) {
          if (!analysisFile.foundValuesComma[key][value]) {
            analysisFile.foundValuesComma[key][value] = 0;
          }
          analysisFile.foundValuesComma[key][value]++;
        }
      }
      for (const lang of result.foundLanguages) {
        if (!analysisFile.foundLanguages[lang]) {
          analysisFile.foundLanguages[lang] = 0;
        }
        analysisFile.foundLanguages[lang]++;
      }
    }

    // Remove values that are below the threshold.
    for (const key of Object.keys(analysisFile.foundValues)) {
      const values = analysisFile.foundValues[key];
      for (const value of Object.keys(values)) {
        if (values[value] < valueThreshold) {
          delete values[value];
        }
      }
      if (Object.keys(values).length === 0) {
        delete analysisFile.foundValues[key];
        if (!analysisFile.foundUniqueKeys.includes(key)) {
          analysisFile.foundUniqueKeys.push(key);
        }
      }
    }
    for (const key of Object.keys(analysisFile.foundValuesComma)) {
      const values = analysisFile.foundValuesComma[key];
      for (const value of Object.keys(values)) {
        if (values[value] < valueThreshold) {
          delete values[value];
        }
      }
      if (Object.keys(values).length === 0) {
        delete analysisFile.foundValuesComma[key];
        if (!analysisFile.foundUniqueKeys.includes(key)) {
          analysisFile.foundUniqueKeys.push(key);
        }
      }
    }

    await mkdirp(join(api.build.filesDir, "meta"));
    await Bun.write(join(api.build.filesDir, "meta", "metadata-analysis.json"), JSON.stringify(analysisFile, null, 2));
  },
  handler: async (resource, api, config) => {
    const { language = "en", translate = true } = config || {};
    const foundKeys: string[] = [];
    const foundValues: Record<string, string[]> = {};
    const foundValuesComma: Record<string, string[]> = {};
    const foundLanguages: Set<string> = new Set();

    const fullResource = resource.vault?.get(api.resource);
    if (fullResource?.metadata) {
      const metadata: DescriptiveProperties["metadata"] = fullResource.metadata;
      for (const entry of metadata) {
        const label = entry.label || {};
        const value = entry.value || {};
        const labelLanguages = Object.keys(label);
        const valueLanguages = Object.keys(value);

        const primaryLabel = await getSingleLabel(label, {
          language,
          translate,
        });

        for (const lang of labelLanguages) {
          foundLanguages.add(lang);
        }
        for (const lang of valueLanguages) {
          foundLanguages.add(lang);
        }

        if (primaryLabel) {
          foundKeys.push(primaryLabel);
          // First check individual values.
          for (const lang of valueLanguages) {
            const values = value[lang];
            if (values) {
              for (const v of values) {
                if (!foundValues[primaryLabel]) {
                  foundValues[primaryLabel] = [];
                }
                foundValues[primaryLabel].push(v);
                for (const value of v.split(",")) {
                  const trimmed = value.trim();
                  if (!foundValuesComma[primaryLabel]) {
                    foundValuesComma[primaryLabel] = [];
                  }
                  foundValuesComma[primaryLabel].push(trimmed);
                }
              }
            }
          }
        }
      }
    }

    return {
      temp: {
        foundKeys,
        foundValues,
        foundValuesComma,
        foundLanguages: Array.from(foundLanguages),
      },
    };
  },
};
