import { extract } from "iiif-hss";
import { getValue } from "@iiif/helpers";

extract(
  {
    id: "delft-extract-labels",
    name: "Extract labels",
    types: ["Collection", "Manifest"],
    invalidate: () => true,
  },
  async function (_, api, config) {
    const resource = api.resource;
    if (!resource) return false;

    const label = resource.label;
    const summary = resource.summary;

    return {
      meta: {
        label: getValue(label),
        intlLabel: label,
        intlSummary: summary
      },
    };
  }
);
