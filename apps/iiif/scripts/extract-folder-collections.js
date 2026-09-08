// Delft-owned build step, migrated from iiif-hss.
import { extract } from "iiif-hss";
import micromatch from "micromatch";
function normalizePath(path) {
  return path.replace(/^\/+/, "").replace(/\/+$/, "");
}
function pathDepth(path) {
  return normalizePath(path).split("/").filter(Boolean).length;
}
export const extractFolderCollections = {
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

extract(extractFolderCollections, extractFolderCollections.handler);
