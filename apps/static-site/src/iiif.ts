import { Collection } from "@iiif/presentation-3";

let IIIF_URL = process.env["IIIF_URL"] || "http://localhost:7111/";

if (!IIIF_URL.endsWith("/")) {
  IIIF_URL += "/";
}

export async function loadCollection(slug: string) {
  const collectionReq = fetch(`${IIIF_URL}${slug}/collection.json`);
  // const metaReq = fetch(`${IIIF_URL}${slug}/meta.json`);
  const ret: { collection: Collection; meta: any } = { meta: {} } as any;

  const [collection, meta] = await Promise.all([collectionReq, Promise.resolve({ ok: false })]);

  if (meta.ok) {
    // ret.meta = await meta.json();
  }

  ret.collection = await collection.json();

  return ret;
}

export async function loadManifest(slug: string) {
  const manifestReq = fetch(`${IIIF_URL}${slug}/manifest.json`);
  const metaReq = fetch(`${IIIF_URL}${slug}/meta.json`);

  return Promise.all([manifestReq, metaReq]).then(async ([manifest, meta]) => {
    return {
      manifest: await manifest.json(),
      meta: await meta.json(),
    };
  });
}

export async function loadManifestMeta(slug: string) {
  const resp = await fetch(`${IIIF_URL}${slug}/meta.json`);
  if (resp.ok) {
    return resp.json();
  }

  return null;
}
