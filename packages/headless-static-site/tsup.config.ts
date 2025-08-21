import { defineConfig } from "tsup";

export default defineConfig({
  target: "node22",
  format: "esm",
  external: [],
  dts: true,
  loader: {
    ".html": "text",
  },
});
