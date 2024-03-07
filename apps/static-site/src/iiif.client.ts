"use client";

import { create } from "iiif-hss/client";
import slugs from "../public/iiif/config/slugs.json";

export const client = create(`http://localhost:3000/`);

export function getManifestUrl(manifestSlug: string) {
  const resp = client.resolveFromSlug(manifestSlug, "Manifest", slugs as any);
  if (!resp) {
    return `/iiif/${manifestSlug}/manifest.json`;
  }
  return resp.match;
}
