"use client";

import { cache } from "react";
export { IIIF_URL } from "./iiif";
import { IIIF_URL } from "./iiif";

export const getImageServiceLinks = cache(
  (): Promise<{
    [slug: string]: [
      {
        slug: string;
        service: string;
        canvasId: string;
        targetCanvasId: string;
      },
    ];
  }> => fetch(`${IIIF_URL}meta/image-service-links.json`).then((r) => r.json()),
);
