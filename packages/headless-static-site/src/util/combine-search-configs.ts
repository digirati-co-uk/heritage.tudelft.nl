import type { SearchExtractionConfig } from "./extract";

export function combineSearchConfigs(
  name: string,
  configs: Array<SearchExtractionConfig>
): SearchExtractionConfig & { indexName: string } {
  const combinedConfig: SearchExtractionConfig & { indexName: string } = {
    allIndices: false,
    indexName: name,
    indices: [],
    emitCombined: true,
    schema: {
      fields: [],
    },
  };
  const schemaRecord: Record<string, SearchExtractionConfig["schema"][0]> = {};

  for (const config of configs) {
    if (!config) continue;
    if (config.allIndices) {
      combinedConfig.allIndices = true;
    }
    if (typeof config.emitCombined !== "undefined") {
      combinedConfig.emitCombined = config.emitCombined;
    }
    if (config.indices) {
      for (const index of config.indices) {
        if (combinedConfig.indices) {
          if (combinedConfig.indices.includes(index)) continue;
          combinedConfig.indices?.push(index);
        }
      }
    }
    if (!config.schema) continue;

    const { fields = [], ...otherFields } = config.schema;

    combinedConfig.schema = {
      ...combinedConfig.schema,
      ...otherFields,
    };

    for (const field of fields) {
      if (!schemaRecord[field.name]) {
        schemaRecord[field.name] = field;
      } else {
        schemaRecord[field.name] = {
          ...schemaRecord[field.name],
          ...field,
        };
      }
    }
  }

  combinedConfig.schema.fields = Object.values(schemaRecord);

  return combinedConfig;
}
