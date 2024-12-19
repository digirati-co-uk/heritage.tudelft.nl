import { existsSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

export function createFiletypeCache(cacheFile: string) {
  let isLoaded = false;
  let didChange = false;
  let fileTypeCache: Record<string, string> = {};

  const loadIfExists = async () => {
    if (isLoaded) return;
    isLoaded = true;
    if (existsSync(cacheFile)) {
      fileTypeCache = await Bun.file(cacheFile).json();
    }
  };

  return {
    //
    async getFileType(filePath: string) {
      await loadIfExists();
      if (fileTypeCache[filePath]) {
        return fileTypeCache[filePath];
      }

      if (existsSync(filePath)) {
        if (filePath.endsWith("/_collection.yml") || filePath.endsWith("/_collection.yaml")) {
          fileTypeCache[filePath] = "Collection";
          didChange = true;
          return fileTypeCache[filePath];
        }

        let jsonResource = await import(join(cwd(), filePath));

        if (jsonResource.default) {
          jsonResource = jsonResource.default;
        }

        let type = jsonResource.type || jsonResource["@type"];

        switch (type) {
          case "sc:Manifest":
            type = "Manifest";
            break;
          case "sc:Collection":
            type = "Collection";
            break;
        }

        fileTypeCache[filePath] = type;

        didChange = true;

        return fileTypeCache[filePath];
      }

      return null;
    },
    async save() {
      if (didChange) {
        await Bun.write(cacheFile, JSON.stringify(fileTypeCache, null, 2));
      }
    },
  };
}
