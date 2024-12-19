import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getValue } from "@iiif/helpers";
import type { InternationalString } from "@iiif/presentation-3";
import { mkdirp } from "mkdirp";
import type { Enrichment } from "../util/enrich";

const schema = {
  name: "manifests",
  enable_nested_fields: true,
  fields: [
    { name: "id", type: "string" },
    { name: "type", type: "string", facet: true },
    { name: "label", type: "string" },
    { name: "full_label", type: "object", optional: true },
    { name: "summary", type: "string", optional: true },
    { name: "collections", type: "string[]", facet: true, optional: true },
    { name: "plaintext", type: "string", optional: true },

    // other fields
    { name: "slug", type: "string" },
    { name: "url", type: "string", optional: true },
    { name: "totalItems", type: "int32", optional: true },
    { name: "thumbnail", type: "string", index: false, optional: true },
  ],
};

type SingleRecord = {
  id: string;
  type: string;
  slug: string;
  label: string;
  full_label: InternationalString;
  summary: string;
  collections: string[];
  plaintext?: string;
  thumbnail?: string;
} & TopicRecord;

type TopicRecord = Record<`topic_${string}`, string[]>;

export const enrichTypesense: Enrichment<unknown, { record: SingleRecord; foundTopics: string[] }> = {
  id: "typesense-manifests",
  name: "Typesense manifest collection",
  types: ["Manifest", "Collection"],
  invalidate: async () => {
    return true;
  },

  async handler(resource, api) {
    const id = resource.slug.replace("manifests/", "");
    const meta = await api.meta.value;
    const indices = await api.indices.value;

    const extraTopics: TopicRecord = {};

    for (const [k, v] of Object.entries(indices || {})) {
      extraTopics[`topic_${k}`] = v;
    }

    let plaintext = "";
    const keywordsFile = join(api.files, "keywords.txt");
    if (existsSync(keywordsFile)) {
      plaintext = await readFile(keywordsFile, "utf-8");
    }
    const collections = meta.partOfCollections || [];

    return {
      temp: {
        record: {
          id: btoa(id),
          type: resource.type,
          slug: resource.slug,
          label: getValue(api.resource.label),
          full_label: api.resource.label,
          summary: getValue(api.resource.summary),
          thumbnail: meta.thumbnail?.id,
          url: meta.url,
          totalItems: meta.totalItems,
          collections: collections.map((c: any) => c.slug),
          plaintext,
          ...extraTopics,
        },
        foundTopics: Object.keys(extraTopics),
      },
    };
  },

  async collect(temp, api, config) {
    if (!temp) {
      return;
    }

    // Write the schema + the jsonl file with all the data.
    const typeSenseDir = join(api.build.filesDir, "meta", "typesense");
    const schemaFile = join(typeSenseDir, "manifests.schema.json");
    const dataFile = join(typeSenseDir, "manifests.jsonl");

    const foundTopics: string[] = [];
    const topicSchema: any[] = [];
    for (const record of Object.values(temp)) {
      for (const topic of record.foundTopics) {
        if (!foundTopics.includes(topic)) {
          foundTopics.push(topic);
          topicSchema.push({
            name: topic,
            type: "string[]",
            facet: true,
            optional: true,
          });
        }
      }
    }

    await mkdirp(typeSenseDir);

    // Write the schema
    await writeFile(schemaFile, JSON.stringify({ ...schema, fields: [...schema.fields, ...topicSchema] }, null, 2));

    const jsonList = Object.values(temp)
      .map((record) => {
        return JSON.stringify(record.record);
      })
      .join("\n");

    await writeFile(dataFile, jsonList);
  },
};
