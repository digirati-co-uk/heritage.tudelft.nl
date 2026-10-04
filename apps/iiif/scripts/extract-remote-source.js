// Delft-owned build step, migrated from iiif-hss.
import { extract } from "iiif-hss";
export const extractRemoteSource = {
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

extract(extractRemoteSource, extractRemoteSource.handler);
