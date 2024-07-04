import { z } from "zod";
import { propSource } from "@page-blocks/react";

export const manifestSourceProps = z.object({
  link: z.string(),
  thumbnail: z.string().optional(),
  label: z.string(),
  description: z.string().optional(),
});

export type ManifestSearchResponse = {
  results: Array<{
    id: string;
    label: string;
    slug: string;
    thumbnail?: string;
  }>;
};
export const manifestSource = propSource(manifestSourceProps, {
  type: "search",
  url: `/api/manifests?q=%`,
  mapToList: (response: ManifestSearchResponse) => {
    return response.results.map((result) => ({
      label: result.label,
      thumbnail: result.thumbnail,
      props: {
        link: result.slug,
        thumbnail: result.thumbnail,
        label: result.label,
      } as any,
    }));
  },
});
