import { defineConfig } from "tsdown";

export default defineConfig((options) => ({
  dts: true,
  exports: {
    customExports: (exports) => {
      exports["./dist/lib.css"] = "./dist/lib.css";
      return exports;
    },
  },
  clean: !options.watch,
  minify: !options.watch,
  target: ["es2021"],
  format: ["esm", "cjs"],
  platform: "browser",
  entry: {
    index: "src/bundle.ts",
    lib: "src/styles/lib.css",
    library: "src/library.ts",
    tailwind: "src/tailwind.ts",
  },
  globalName: "DelftExhibitionViewer",
  ignoreWatch: [".turbo"],
  outputOptions: {
    inlineDynamicImports: true,
  },
}));
