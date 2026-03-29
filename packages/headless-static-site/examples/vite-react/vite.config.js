import react from "@vitejs/plugin-react";
import iiif from "iiif-hss/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    iiif({ collection: "https://theseusviewer.org/cookbook-collection.json" }),
  ],
});
