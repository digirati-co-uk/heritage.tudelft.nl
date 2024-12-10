import type { Collection } from "@iiif/presentation-3";

export function createCollection(opts: {
  configUrl?: string;
  slug?: string;
  label: string;
}): Omit<Collection, "items">;
export function createCollection(opts: {
  configUrl?: string;
  slug?: string;
  label: string;
}): Omit<Collection, "items"> {
  return {
    "@context": "http://iiif.io/api/presentation/3/context.json",
    id: `${opts.configUrl}/${opts.slug}/collection.json`,
    type: "Collection" as const,
    label: { en: [opts.label] },
    "hss:slug": opts.slug,
  } as any;
}
