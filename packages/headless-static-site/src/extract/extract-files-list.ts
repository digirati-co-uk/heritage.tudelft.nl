import { statSync } from "fs";
import type { Extraction } from "../util/extract.ts";
import fs from "fs/promises";
import { join } from "path";

export const extractFilesList: Extraction = {
  id: "extract-files-list",
  name: "Extract files list",
  types: ["Manifest", "Canvas"],
  async invalidate(canvas, api) {
    const cache = await api.caches.value;
    return !cache.dims;
  },
  async handler(manifest, api) {
    const filesDir = join(api.build.cacheDir, manifest.slug, "files");
    const filesExist = await fs.exists(filesDir);

    if (filesExist) {
      const files = await fs.readdir(filesDir, { recursive: true });
      const filtered = files.filter((file) => {
        if (file.startsWith(".")) {
          return false;
        }

        if (statSync(join(filesDir, file)).isDirectory()) {
          return false;
        }

        return true;
      });

      if (api.config.file_templates) {
        const filesDetail: Record<string, any> = {};
        for (const file of files) {
          const fileName = file.split("/").pop() || file;
          if (!fileName) continue;
          const detail = api.config.file_templates[fileName];
          if (detail) {
            filesDetail[file] = {
              id: file,
              ...detail,
            };
          }
        }
        return { meta: { files: filtered, filesDetail } };
      }

      return {
        meta: { files: filtered },
      };
    }

    return {};
  },
};
