"use client";

import { create } from "iiif-hss/client";
import { cache } from "react";

export let IIIF_URL =
  process.env["IIIF_URL"] ||
  process.env["NEXT_PUBLIC_IIIF_URL"] ||
  "http://localhost:7111/";

if (!IIIF_URL.endsWith("/")) {
  IIIF_URL += "/";
}

// Check netlify deploy preview.
// https://deploy-preview-1--delft-iiif.netlify.app
if (process.env["DEPLOY_PRIME_URL"]) {
  const previewRegex = /https:\/\/deploy-preview-(\d+)--\//;
  const match = process.env["DEPLOY_PRIME_URL"].match(previewRegex);
  if (match && match[1]) {
    const previewNumber = match[1];
    IIIF_URL = `https://deploy-preview-${previewNumber}--delft-iiif.netlify.app`;
  }
}

// const slugs = await fetch(`${IIIF_URL}config/slugs.json`).then((r) =>
//   r.json(),
// );
const slugs = {};

export const client = create(IIIF_URL);

export function getManifestUrl(manifestSlug: string) {
  const resp = client.resolveFromSlug(manifestSlug, "Manifest", slugs as any);
  if (!resp) {
    return `/iiif/${manifestSlug}/manifest.json`;
  }
  return resp.match;
}

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
