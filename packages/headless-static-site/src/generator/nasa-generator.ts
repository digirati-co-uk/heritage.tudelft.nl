import { GeneratorReference, IIIFGenerator } from "../util/iiif-generator.ts";
import { NASA } from "./nasa-generator/NASA.ts";
import {
  CollectionResponse,
  SearchCollectionItem,
} from "./nasa-generator/NASA.types.ts";
import { assetToManifest } from "./nasa-generator/asset-to-manifest.ts";

export const nasaGenerator: IIIFGenerator<
  { testing: boolean; opt?: string },
  { query: string; maxPages?: number; maxResults?: number }
> = {
  id: "nasa-generator",
  name: "NASA Generator",
  async prepare(gen) {
    const api = new NASA(gen.requestCache.fetch);
    const q = gen.config.query;
    const maxPages = gen.config.maxPages || 1;
    const maxResults = gen.config.maxResults || 50;

    const search = await api.search({
      description: q,
      media_type: ["image"],
      page: 1,
    });

    const foundResources: GeneratorReference[] = [];
    let nextPage = search.collection.links.find((l) => l.rel === "next");
    let currentChecked = 1;
    let currentResults = 0;

    for (const result of search.collection.items) {
      const item = result.data[0];
      currentResults++;
      if (currentResults > maxResults) break;
      foundResources.push({
        id: item.nasa_id,
        type: "Manifest",
        data: item,
      });
    }

    while (nextPage && currentChecked <= maxPages) {
      const next = await api.link<CollectionResponse<SearchCollectionItem>>(
        nextPage.href,
      );
      for (const result of next.collection.items) {
        currentResults++;
        if (currentResults > maxResults) break;
        const item = result.data[0];
        foundResources.push({
          id: item.nasa_id,
          type: "Manifest",
          data: item,
        });
      }
      nextPage = next.collection.links.find((l) => l.rel === "next");
      currentChecked++;
    }

    // Always called, even if there is nothing to run.
    return foundResources;
  },

  async generateEach(resource, directory, api) {
    const nasa = new NASA(api.requestCache.fetch);
    const fullData = await nasa.asset(resource.id);

    const manifest = await assetToManifest(
      resource.id,
      fullData,
      nasa,
      api.builder,
      "https://example.org/",
    );

    api.saveJson(`${resource.id}.json`, manifest);

    // This will be called once per item in the prepare step.
    return {
      cache: {
        resource,
        fullData,
      },
    };
  },
};
