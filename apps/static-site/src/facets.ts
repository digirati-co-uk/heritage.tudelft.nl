import type { InternationalString } from "@iiif/presentation-3";

// This is the code for configuring facets.
export const facetConfig = {
  exclude: ["contributor"],

  order: ["exampleOfWork", "material"],

  metadata: {
    // Override labels.
    exampleOfWork: {
      label: { en: ["Object name"], nl: ["Objectnaam"] },
    },
    material: {
      label: { en: ["Material"], nl: ["Materiaal"] },
      interactive: true,
    },
  } as Record<string, { label: InternationalString; interactive?: boolean }>,
};
