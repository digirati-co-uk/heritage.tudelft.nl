// Delft-owned build step, migrated from iiif-hss.
import { extract } from "iiif-hss";
import { getSingleLabel } from "../helpers/get-single-label.js";
export const extractTopics = {
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
    const metadataLabels = await Promise.all(
      metadata.map((item) =>
        getSingleLabel(item.label, {
          language,
          translate,
          fetch: api.build?.fetch,
        }),
      ),
    );
    const indices = {};
    for (const topic of topicsToParse) {
      const configuredLabels = config.topicTypes[topic];
      const topicLabels = Array.isArray(configuredLabels)
        ? configuredLabels
        : [configuredLabels];
      for (const topicType of topicLabels) {
        const index = metadataLabels.indexOf(topicType);
        if (index === -1) {
          continue;
        }
        const values = metadata[index].value;
        const first = Object.keys(values)[0];
        const value = values[first];
        if (value) {
          if (commaSeparated.includes(topic)) {
            for (const v of value) {
              indices[topic] = indices[topic] || [];
              indices[topic].push(...v.split(",").map((t) => t.trim()));
            }
          } else {
            indices[topic] = indices[topic] || [];
            indices[topic].push(...value);
          }
        }
      }
      if (indices[topic]) {
        indices[topic] = [
          ...new Set(
            indices[topic]
              .map((value) => (typeof value === "string" ? value.trim() : ""))
              .filter(Boolean),
          ),
        ];
      }
    }
    return {
      indices,
    };
  },
};

extract(extractTopics, extractTopics.handler);
