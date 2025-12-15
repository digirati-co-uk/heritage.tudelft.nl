import { defineConfig } from "vite";
import { enrich } from "./lib/scripts";
import iiifPlugin from "./src/vite-plugin";

enrich(
  {
    id: "my-custom-enrich",
    name: "My custom",
    types: ["Manifest"],
  },
  async () => {
    console.log("custom enrich");
    return {};
  }
);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    iiifPlugin({
      config: {
        run: [
          "my-custom-enrich",
          "flat-manifests",
          "extract-remote-source",
          "extract-slug-source",
          "extract-label-string",
          "extract-thumbnail",
          "metadata-analysis",
          "folder-collections",
          "extract-files-list",
          "enrich-files-rewrite",
        ],
        stores: {
          test: {
            path: "./content",
            type: "iiif-json",
            subFiles: true,
          },
        },
      },
    }),
  ],
});
