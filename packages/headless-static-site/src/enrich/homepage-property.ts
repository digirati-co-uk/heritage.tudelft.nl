import type { Enrichment } from "../util/enrich";

export const homepageProperty: Enrichment = {
  id: "homepage-property",
  name: "Homepage property",
  types: ["Manifest"],
  async invalidate(resource, api) {
    if (resource.id && resource.type === "Manifest") {
      const homepage = `${api.config.server?.url}/${resource.slug}`;
      const existingHomepage = api.resource.homepage.find((h: any) => h.id === homepage);
      return !existingHomepage;
    }

    return true;
  },
  async handler(resource, api) {
    if (resource.id) {
      const found = api.builder.vault.get(resource.id);
      if (!found || found.type !== "Manifest") {
        return {};
      }

      api.builder.editManifest(resource.id, (m: any) => {
        if (m.entity.homepage) {
          m.setHomepage({
            id: `${api.config.server?.url}/${resource.slug}`,
          });
        }
      });

      return { didChange: true };
    }

    return {};
  },
};
