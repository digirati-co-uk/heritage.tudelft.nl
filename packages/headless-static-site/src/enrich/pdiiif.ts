import { createWriteStream, existsSync } from "node:fs";
import { join } from "node:path";
import { mkdirp } from "mkdirp";
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
    mkdirp.sync(api.files);
    const p3Manifest = resource.vault?.toPresentation3({
      id: resource.id,
      type: "Manifest",
    });
    const buffer = createWriteStream(join(api.files, "manifest.pdf"));
    await convertManifest(p3Manifest as any, buffer, {});
    return {};
  },
};
