import { createWriteStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { convertManifest } from "pdiiif";
import type { Enrichment } from "../util/enrich";
export const pdiiif: Enrichment = {
  id: "pdiiif",
  name: "PDIIIF",
  types: ["Manifest"],
  async invalidate(resource, api) {
    return !existsSync(join(api.files, "manifest.pdf"));
  },
  async handler(resource, api) {
    await mkdir(api.files, { recursive: true });
    const p3Manifest = resource.vault?.toPresentation3({
      id: resource.id,
      type: "Manifest",
    });
    const buffer = createWriteStream(join(api.files, "manifest.pdf"));
    await convertManifest(p3Manifest as any, buffer, {});
    return {};
  },
};
