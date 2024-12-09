import yamlPlugin from "bun-plugin-yaml";

Bun.plugin(yamlPlugin());

export { build } from "./commands/build.ts";
