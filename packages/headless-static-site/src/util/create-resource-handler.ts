import { join } from "node:path";
import type { FileHandler } from "./file-handler";

export interface ResourceFilesApi {
  exists: (path: string) => Promise<boolean>;
  readFile: (path: string) => Promise<null | Buffer<ArrayBufferLike>>;
  writeFile: (path: string, data: string | Buffer) => Promise<void>;
  loadJson<T = any>(path: string): Promise<null | T>;
  saveJson(path: string, data: object): Promise<void>;
}

export function createResourceHandler(filesDirectory: string, files: FileHandler): ResourceFilesApi {
  return {
    exists: async (path: string) => files.exists(join(filesDirectory, path)),
    readFile: async (path: string) => {
      const fullPath = join(filesDirectory, path);
      if (!files.exists(fullPath)) {
        return null;
      }
      return files.readFile(join(filesDirectory, path));
    },
    writeFile: async (path: string, data: string | Buffer) => files.writeFile(join(filesDirectory, path), data),
    loadJson: async (path: string) => {
      const fullPath = join(filesDirectory, path);
      if (!files.exists(fullPath)) {
        return null;
      }
      return files.loadJson(fullPath);
    },
    saveJson: async (path: string, data: object) => files.saveJson(join(filesDirectory, path), data),
  };
}
