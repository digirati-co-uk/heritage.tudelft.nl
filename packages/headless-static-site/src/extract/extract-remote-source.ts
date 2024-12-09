import { Extraction } from "../util/extract.ts";

export const extractRemoteSource: Extraction = {
  id: "extract-remote-source",
  name: "Extract remote source",
  types: ["Manifest", "Collection"],
  invalidate: async () => true,
  handler: async (resource) => {
    if (resource.source.type === "remote") {
      const { type, url } = resource.source;
      return {
        meta: { url },
      };
    }
    return {};
  },
};
