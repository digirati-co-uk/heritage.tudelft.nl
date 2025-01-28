import { type Options, defineConfig } from "tsup";

export default defineConfig((options: Options) => ({
  dts: true,
  clean: true,
  target: ["es2020"],
  format: ["esm", "cjs"],
  platform: "browser",
  entry: {
    index: "src/bundle.ts",
  },
  minify: false,
  splitting: true,
  external: ["react", "react/jsx-runtime"],
  globalName: "DelftExhibitionViewer",
  esbuildOptions: (opt) => {
    opt.external = ["react", "react/jsx-runtime"];
  },
  esbuildPlugins: [],
  ...options,
}));
