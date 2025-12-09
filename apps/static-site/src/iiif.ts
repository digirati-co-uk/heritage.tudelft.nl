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

export async function loadCollection(slug: string) {
  try {
    const collectionReq = fetch(
      `${IIIF_URL}${slug}/collection.json`,
      fetchOptions,
    );
    // const metaReq = fetch(`${IIIF_URL}${slug}/meta.json`);
    const ret: { collection: Collection; meta: any } = { meta: {} } as any;

    const [collection, meta] = await Promise.all([
      collectionReq,
      Promise.resolve({ ok: false }),
    ]);

    if (meta.ok) {
      // ret.meta = await meta.json();
    }

    ret.collection = await collection.json();

    return ret;
  } catch (error) {
    return { collection: null, meta: null };
  }
}

export async function loadCollectionMeta(slug: string) {
  const resp = await fetch(`${IIIF_URL}${slug}/meta.json`);

  if (resp.ok) {
    const json = await resp.json();
    return json;
  }
}

export async function loadMeta(name: string) {
  return fetch(`${IIIF_URL}/meta/${name}`, fetchOptions).then((r) => r.json());
}

export async function loadManifest(slug: string) {
  try {
    const manifestReq = fetch(`${IIIF_URL}${slug}/manifest.json`, fetchOptions);
    const metaReq = fetch(`${IIIF_URL}${slug}/meta.json`, fetchOptions);

    return await Promise.all([manifestReq, metaReq]).then(
      async ([manifest, meta]) => {
        return {
          manifest: await manifest.json(),
          meta: await meta.json(),
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
