import { readFileSync } from "node:fs";
import { env } from "node:process";
import { parse as parseYaml } from "yaml";

const config = parseYaml(readFileSync(".iiifrc-base.yml", "utf8"));

export const run = config.run;
export const collections = config.collections;
export const stores = config.stores;

const url = env["IIIF_PREVIEW_URL"] || env["IIIF_URL"] || "http://localhost:3000";

export const server = {
  url,
};
