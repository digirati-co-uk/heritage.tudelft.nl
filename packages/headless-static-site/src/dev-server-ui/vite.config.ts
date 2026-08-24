import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: rootDir,
  base: "./",
  plugins: [tailwindcss()],
  build: {
    outDir: resolve(rootDir, "../../build/dev-ui"),
    emptyOutDir: true,
  },
});
