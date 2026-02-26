import micromatch from "micromatch";
import type { Extraction } from "../util/extract.ts";

export interface FolderCollectionsConfig {
  enabled?: boolean;
  minDepth?: number;
  ignorePaths?: string[];
  labelStrategy?: "folderName" | "metadata" | "customMap";
  customMap?: Record<string, string | { [lang: string]: string[] }>;
}

function normalizePath(path: string) {
  return path.replace(/^\/+/, "").replace(/\/+$/, "");
}

function pathDepth(path: string) {
  return normalizePath(path).split("/").filter(Boolean).length;
}

export const extractFolderCollections: Extraction<FolderCollectionsConfig> = {
  id: "folder-collections",
  name: "Folder Collections",
  types: ["Manifest"],
  invalidate: async () => true,
  async handler(resource, api, config) {
    const { enabled = true, minDepth = 1, ignorePaths = [] } = config || {};

    if (!enabled) {
      return {};
    }
    if (resource.source.type !== "disk") return {};

    const filePath = normalizePath(resource.source.relativePath || "");
    if (filePath) {
      if (pathDepth(filePath) < Math.max(0, minDepth || 0)) {
        return {};
      }
      if (ignorePaths.length && micromatch.isMatch(filePath, ignorePaths)) {
        return {};
      }
      return {
        collections: [filePath],
      };
    }

    return {};
  },
};
