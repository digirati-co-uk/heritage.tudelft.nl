import { extract } from "iiif-hss";

extract(
  {
    id: "site-collections",
    name: "Site collections",
    types: ["Collection"],
  },
  async function (resource, api, config) {
    if (resource.source.type !== "disk") return {};

    // console.log(resource.source.path);

    return {
      collections: ["site"],
    };
  },
);
