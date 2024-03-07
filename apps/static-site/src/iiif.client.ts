"use client";

import { create } from "iiif-hss/client";
import slugs from "@repo/iiif/build/config/slugs.json";

let IIIF_URL = process.env["IIIF_PREVIEW_URL"] || "http://localhost:7111/";

if (!IIIF_URL.endsWith("/")) {
  IIIF_URL += "/";
}

export const client = create(IIIF_URL);

export function getManifestUrl(manifestSlug: string) {
  const resp = client.resolveFromSlug(manifestSlug, "Manifest", slugs as any);
  if (!resp) {
    return `/iiif/${manifestSlug}/manifest.json`;
  }
  return resp.match;
}
