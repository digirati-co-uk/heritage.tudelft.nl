import { type Options, defineConfig } from "tsup";

export default defineConfig((options: Options) => ({
  dts: true,
  clean: false,
  target: ["es2020"],
  format: ["esm", "cjs"],
  platform: "browser",
  entry: {
    index: "src/bundle.ts",
    lib: "src/styles/lib.css",
  },
  minify: false,
  splitting: false,
  external: [
    //
    "react",
    "react/jsx-runtime",
    "@iiif/helpers",
    "@iiif/presentation-3",
    "@iiif/presentation-3-normalized",
    "@vidstack/react",
    "react-lazy-load-image-component",
    "mitt",
    "publint",
    "react",
    "react-aria",
    "react-dom",
    "react-iiif-vault",
    "reveal.js",
    "tailwind-merge",
    "tiny-invariant",
    "use-sync-external-store",
  ],
  globalName: "DelftExhibitionViewer",
  esbuildOptions: (opt) => {
    opt.jsx = "automatic";
    opt.external = ["react", "react/jsx-runtime"];
  },
  esbuildPlugins: [],
  ...options,
}));
