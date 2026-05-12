import type { InternationalString } from "@iiif/presentation-3";

// This is the code for configuring facets.
export const facetConfig = {
  exclude: [],

  order: ["format", "contributor", "material", "date"],

  metadata: {
    // Override labels.
    format: {
      label: { en: ["Object name"], nl: ["Objectnaam"] },
      interactive: true,
    },
    material: {
      label: { en: ["Material"], nl: ["Materiaal"] },
      interactive: true,
    },
    contributor: {
      label: { en: ["Maker"], nl: ["Maker"] },
      interactive: true,
    },
    date: {
      label: { en: ["Year"], nl: ["Jaar"] },
    },
  } as Record<string, { label: InternationalString; interactive?: boolean }>,
};
