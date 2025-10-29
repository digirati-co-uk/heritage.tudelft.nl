import { defineConfig } from "tsdown";

export default defineConfig({
  dts: true,
  clean: true,
  target: ['es2021'],
  format: ["esm", "cjs"],
  platform: "browser",
  entry: {
    index: "src/bundle.ts",
    lib: "src/styles/lib.css",
  },
  minify: true,
  globalName: "DelftExhibitionViewer",
  ignoreWatch: [".turbo"],
  outputOptions: {
    inlineDynamicImports: true,
  },
});
