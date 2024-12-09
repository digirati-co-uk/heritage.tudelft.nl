import { Extraction } from "../util/extract.ts";
import { getValue } from "@iiif/helpers/i18n";
import { getSingleLabel } from "../util/get-single-label.ts";

interface ExtractTopicsConfig {
  language?: string;
  translate?: boolean;
  commaSeparated?: string[];
  topicTypes: Record<string, string | string[]>; // e.g. { author: ['Author', 'Written by'] } and it will look in the metadata for these.
}

export const extractTopics: Extraction<ExtractTopicsConfig> = {
  id: "extract-topics",
  name: "Extract Topics",
  types: ["Manifest"],

  invalidate: async () => {
    return true;
  },

  handler: async (resource, api, config) => {
    const {
      commaSeparated = [],
      translate = true,
      topicTypes = {},
      language = "en",
    } = config;

    const topicsToParse = Object.keys(topicTypes);
    const latestResource = resource.vault?.get(api.resource);
    const metadata = latestResource?.metadata || [];
    const metadataLabels: string[] = await Promise.all(
      metadata.map((item: any) =>
        getSingleLabel(item.label, { language, translate }),
      ),
    );

    const indices: Record<string, string[]> = {};

    for (const topic of topicsToParse) {
      const topicTypes = config.topicTypes[topic];
      for (const topicType of topicTypes) {
        const index = metadataLabels.indexOf(topicType);
        if (index === -1) {
          continue;
        }
        const values = metadata[index].value;
        const first = Object.keys(values)[0];
        const value = values[first] as string[];
        if (value) {
          if (commaSeparated.includes(topic)) {
            value.forEach((v) => {
              indices[topic] = indices[topic] || [];
              indices[topic].push(...v.split(",").map((t) => t.trim()));
            });
          } else {
            indices[topic] = indices[topic] || [];
            indices[topic].push(...value);
          }
        }
      }
    }

    return {
      indices,
    };
  },
};
