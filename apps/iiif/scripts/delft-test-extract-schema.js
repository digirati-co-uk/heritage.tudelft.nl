import { getValue } from "@iiif/helpers";
import { extract } from "iiif-hss";

extract(
  {
    id: "delft-test-extract-schema",
    name: "Extract from schema",
    types: ["Manifest"],
    invalidate: () => true,
    search: {
      manifests: {
        fields: [
          // New field example, extract from schema.
          { name: "identifier", type: "string", optional: true },
        ],
      },
    },
  },
  async (_, api, config) => {
    if (!(await api.resourceFiles.exists("schema.json"))) {
      return {};
    }

    const schema = await api.resourceFiles.loadJson("schema.json");
    if (!schema) return {};

    return {
      indices: {
        exampleOfWork: [schema.exampleOfWork.name],
      },
      search: {
        record: {
          identifier: schema.identifier,
        },
      },
    };
  },
);
