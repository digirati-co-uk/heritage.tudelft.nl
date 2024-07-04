import { z } from "zod";
import { propSource } from "@page-blocks/react";

export const boxSourceProps = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  type: z.string(),
  link: z.string(),
  backgroundImage: z.string().optional(),
  backgroundColor: z.string().optional(),
  dark: z.boolean().optional(),
});

export type BoxSearchResponse = {
  results: Array<{
    id: string;
    type: string;
    title: string;
    link: string;
    subtitle?: string;
    thumbnail?: string;
    color?: string;
  }>;
};

const mapToList = (response: BoxSearchResponse) => {
  return response.results.map((result) => ({
    label: result.title,
    thumbnail: result.thumbnail,
    props: {
      type: result.type,
      title: result.title,
      link: result.link,
      subtitle: result.subtitle,
      backgroundImage: result.thumbnail,
      backgroundColor: result.color as any,
    },
  }));
};

export const boxPublicationSource = propSource(boxSourceProps, {
  type: "search",
  url: `/api/box?type=publication&q={query}`,
  mapToList,
});

export const boxCollectionSource = propSource(boxSourceProps, {
  type: "search",
  url: `/api/box?type=collection&q={query}`,
  mapToList,
});

export const boxManifestSource = propSource(boxSourceProps, {
  type: "search",
  url: `/api/box?type=manifest&q={query}`,
  mapToList,
});

export const boxExhibitionSource = propSource(boxSourceProps, {
  type: "search",
  url: `/api/box?type=exhibition&q={query}`,
  mapToList,
});
