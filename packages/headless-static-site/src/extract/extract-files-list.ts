import { existsSync, statSync } from "node:fs";
import fs from "node:fs/promises";
import { join } from "node:path";
import type { Extraction } from "../util/extract.ts";

export const extractFilesList: Extraction<{
  fileTemplates: Record<string, any>;
}> = {
  id: "extract-files-list",
  name: "Extract files list",
  types: ["Manifest", "Canvas"],
  async invalidate(canvas, api) {
    const cache = await api.caches.value;
    return !cache.dims;
  },
  async handler(manifest, api, config) {
    const filesDir = api.filesDir;
    const filesExist = existsSync(filesDir);

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

      if (config.fileTemplates) {
        const filesDetail: Record<string, any> = {};
        for (const file of files) {
          const fileName = file.split("/").pop() || file;
          if (!fileName) continue;
          const detail = config.fileTemplates[fileName];
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
