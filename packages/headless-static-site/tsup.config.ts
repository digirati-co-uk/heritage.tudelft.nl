import { defineConfig } from "tsup";

const baseConfig = {
  target: "node22",
  format: ["esm"] as const,
  external: [],
  loader: {
    ".html": "text" as const,
  },
};

export default defineConfig([
  {
    ...baseConfig,
    clean: true,
    splitting: false,
    dts: false,
    outDir: "build",
    entry: {
      index: "src/index.ts",
      "server/entrypoint": "src/entrypoint.ts",
    },
  },
  {
    ...baseConfig,
    clean: false,
    splitting: true,
    dts: true,
    outDir: "build",
    entry: {
      client: "src/dev/client.ts",
      "node-client": "src/dev/node-client.ts",
      library: "src/library.ts",
      "vite-plugin": "src/vite-plugin.ts",
      "astro-integration": "src/astro-integration.ts",
      "astro/server": "src/astro/server.ts",
      "astro/client": "src/astro/client.ts",
      "vite/client": "src/vite/client.ts",
    },
  },
]);
