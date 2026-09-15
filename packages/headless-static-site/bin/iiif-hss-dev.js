#!/usr/bin/env node

import { existsSync } from "node:fs";

const entrypoint = new URL("../build/server/entrypoint.js", import.meta.url);

if (!existsSync(entrypoint)) {
  console.error(
    "iiif-hss-dev has not been built yet. Run `pnpm --filter iiif-hss run build` from the monorepo root first.",
  );
  process.exit(1);
}

await import(entrypoint.href);
