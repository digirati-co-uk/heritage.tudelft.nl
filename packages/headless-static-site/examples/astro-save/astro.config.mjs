// @ts-check

import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import iiif from "iiif-hss/astro";

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    mdx(),
    iiif({
      collection: "https://theseusviewer.org/cookbook-collection.json",
      save: true,
    }),
  ],
});
