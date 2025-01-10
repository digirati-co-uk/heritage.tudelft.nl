import fs from "node:fs";
import { join } from "node:path";
import { createThumbnailHelper } from "@iiif/helpers";
import type { Enrichment } from "../util/enrich.ts";

export const canvasThumbnail: Enrichment = {
  id: "canvas-thumbnail",
  name: "Canvas thumbnail",
  types: ["Canvas"],
  async invalidate(resource, api) {
    // This will check if the image on disk.
    return !fs.existsSync(join(api.files, "thumb.jpg"));
  },
  async handler(canvas, api) {
    try {
      const helper = createThumbnailHelper(canvas.vault);
      const thumb = await helper.getBestThumbnailAtSize(api.resource, {});

      if (thumb.best?.id && (thumb.best.id.endsWith(".jpg") || thumb.best.id.endsWith(".jpeg"))) {
        const data = await fetch(thumb.best.id).then((r) => r.arrayBuffer());
        await fs.promises.mkdir(api.files, { recursive: true });
        await fs.promises.writeFile(join(api.files, "thumb.jpg"), data as any);
      }
    } catch (err) {
      // ignore.
    }

    return {};
  },
};
