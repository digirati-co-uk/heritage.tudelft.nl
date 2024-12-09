import { Enrichment } from "../util/enrich.ts";
import { createThumbnailHelper } from "@iiif/helpers";
import { join } from "node:path";
import { mkdirp } from "mkdirp";
import { existsSync } from "fs";

export const canvasThumbnail: Enrichment = {
  id: "canvas-thumbnail",
  name: "Canvas thumbnail",
  types: ["Canvas"],
  async invalidate(resource, api) {
    // This will check if the image on disk.
    return !existsSync(join(api.files, `thumb.jpg`));
  },
  async handler(canvas, api) {
    try {
      const helper = createThumbnailHelper(canvas.vault);
      const thumb = await helper.getBestThumbnailAtSize(api.resource, {});

      if (
        thumb.best &&
        thumb.best.id &&
        (thumb.best.id.endsWith(".jpg") || thumb.best.id.endsWith(".jpeg"))
      ) {
        const data = await fetch(thumb.best.id).then((r) => r.arrayBuffer());
        mkdirp.sync(api.files);
        await Bun.write(join(api.files, `thumb.jpg`), data);
      }
    } catch (err) {
      // ignore.
    }

    return {};
  },
};
