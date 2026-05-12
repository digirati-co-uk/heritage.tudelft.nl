import { getValue } from "@iiif/helpers";
import { extract } from "iiif-hss";

function getValueAsArray(prop) {
  return Array.isArray(prop) ? prop : prop === undefined ? [] : [prop];
}

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

    const format = [schema.exampleOfWork.name];

    const contributor = [];
    if (schema.creator) {
      getValueAsArray(schema.creator).forEach((role) => {
        contributor.push(role.creator.name);
      });
    }
    if (schema.contributor) {
      getValueAsArray(schema.contributor).forEach((role) => {
        contributor.push(role.contributor.name);
      });
    }

    let material = [];
    if (schema.material) {
      material = getValueAsArray(schema.material).map(
        (material) => material.name,
      );
    }

    let date = [];
    if (schema.temporalCoverage) {
      date = schema.temporalCoverage.split("/");
    }

    return {
      indices: {
        format,
        contributor,
        material,
        date,
      },
      search: {
        record: {
          identifier: schema.identifier,
        },
      },
    };
  },
);
