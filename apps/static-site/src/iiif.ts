import type { Collection } from "@iiif/presentation-3";
import { cache } from "react";

export let IIIF_URL =
  process.env["IIIF_URL"] ||
  process.env["NEXT_PUBLIC_IIIF_URL"] ||
  "http://localhost:7111/";

if (!IIIF_URL.endsWith("/")) {
  IIIF_URL += "/";
}

const fetchOptions: RequestInit = {
  cache: process.env.NODE_ENV === "production" ? "default" : "no-store",
};

export function relativeIIIFUrl(remoteOrLocal: string) {
  if (remoteOrLocal.startsWith(IIIF_URL)) {
    return remoteOrLocal.slice(IIIF_URL.length - 1);
  }
  return remoteOrLocal;
}

export const loadCollection = cache(async function loadCollection(
  slug: string,
) {
  try {
    const response = await fetch(
      `${IIIF_URL}${slug}/collection.json`,
      fetchOptions,
    );
    if (!response.ok) return { collection: null, meta: null };
    return { collection: (await response.json()) as Collection, meta: {} };
  } catch {
    return { collection: null, meta: null };
  }
});

export async function loadCollectionMeta(slug: string) {
  const resp = await fetch(`${IIIF_URL}${slug}/meta.json`);

  if (resp.ok) {
    const json = await resp.json();
    return json;
  }
}

export const loadMeta = cache(async function loadMeta(name: string) {
  return fetch(`${IIIF_URL}meta/${name}`, fetchOptions).then((r) => r.json());
});

export async function loadManifest(slug: string) {
  try {
    const manifestReq = fetch(`${IIIF_URL}${slug}/manifest.json`, fetchOptions);
    const metaReq = fetch(`${IIIF_URL}${slug}/meta.json`, fetchOptions);

    return await Promise.all([manifestReq, metaReq]).then(
      async ([manifest, meta]) => {
        if (!manifest.ok) return { manifest: null, meta: null };
        return {
          manifest: await manifest.json(),
          meta: meta.ok ? await meta.json() : {},
        };
      },
    );
  } catch (error) {
    return { manifest: null, meta: null };
  }
}

export async function loadManifestMeta(slug: string) {
  const resp = await fetch(`${IIIF_URL}${slug}/meta.json`, fetchOptions);
  if (resp.ok) {
    return resp.json();
  }

  return null;
}

export const getRelatedObjects = cache(() =>
  fetch(`${IIIF_URL}meta/related-objects.json`, fetchOptions).then((r) =>
    r.json(),
  ),
);

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
