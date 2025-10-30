import { readFileSync } from "node:fs";
import { env } from "node:process";
import { parse as parseYaml } from "yaml";

const base = parseYaml(readFileSync(".iiifrc-base.yml", "utf8"));

export const run = base.run;
export const collections = base.collections;
export const stores = base.stores;
export const config = base.config;

const url = env["IIIF_PREVIEW_URL"] || env["IIIF_URL"] || "http://localhost:3000";

export const server = {
  url,
};
