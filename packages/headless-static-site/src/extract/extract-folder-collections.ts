import { Extraction } from "../util/extract.ts";

export const extractFolderCollections: Extraction = {
  id: "folder-collections",
  name: "Folder Collections",
  types: ["Manifest"],
  invalidate: async () => true,
  async handler(resource, api) {
    if (resource.source.type !== "disk") return {};

    const filePath = resource.source.relativePath;
    if (filePath) {
      return {
        collections: [filePath],
      };
    }

    return {};
  },
};
