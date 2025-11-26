import { loadMeta } from "@/iiif";
import { cache } from "react";

export type ViewObjectLink = {
  slug: string;
  service: string;
  canvasId: string;
  targetCanvasId: string;
};

export const getViewObjectLinks = cache(async function getViewObjectLinks(
  slug: string | null,
): Promise<ViewObjectLink[]> {
  if (!slug) return [];
  const allImageServiceLinks = (await loadMeta(
    "image-service-links.json",
  )) as Record<
    string,
    Array<{
      slug: string;
      service: string;
      canvasId: string;
      targetCanvasId: string;
    }>
  >;
  return allImageServiceLinks[slug as any] || [];
});
