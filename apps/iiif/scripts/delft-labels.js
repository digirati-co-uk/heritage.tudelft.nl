import { enrich } from "iiif-hss";
import { getValue } from "@iiif/helpers";

enrich(
  {
    id: "delft-labels",
    name: "Delft labels",
    types: ["Manifest"],
    invalidate: async () => {
      return true;
    },
  },
  async (resource, api) => {
    let didChange = false;
    let changedLabel = null;
    let textLabel = "";
    api.builder.editManifest(resource.id, (manifest) => {
      // const label = manifest.entity.label || {};
      // if (label.en[0] === "") {
      //   const { en, ...restOfLabel } = label;
      //   manifest.setLabel(restOfLabel);
      // }

      const keys = Object.keys(manifest.entity.label || {});
      if (keys.length === 0) {
        const metadata = manifest.entity.metadata || [];
        for (const m of metadata) {
          const nl = (m.label.nl || [])[0];
          const en = (m.label.en || [])[0];
          const none = (m.label.none || [])[0];

          if (nl === "Titel" || en === "Title" || none === "Title" || none === "Titel") {
            const asText = getValue(m.value);
            if (asText) {
              textLabel = asText;
              manifest.setLabel(m.value);
              changedLabel = m.value;
              didChange = true;
              return;
            }
          }
        }
      }
    });

    if (!didChange) {
      return { didChange };
    }

    return { didChange, meta: { label: textLabel } };
  }
);
