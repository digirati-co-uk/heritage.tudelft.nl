import type { Collection, InternationalString } from "@iiif/presentation-3";

export function createCollection({
  configUrl,
  slug,
  label,
  items: _, // Not allowed.
  ...collection
}: {
  configUrl?: string;
  slug?: string;
  label: string | InternationalString;
  summary?: string | InternationalString;
} & Partial<Omit<Collection, "label" | "sumary">>): Omit<Collection, "items"> {
  return {
    "@context": "http://iiif.io/api/presentation/3/context.json",
    id: `${configUrl}/${slug}/collection.json`,
    type: "Collection" as const,
    label: typeof label === "string" ? { en: [label] } : label,
    summary: collection.summary
      ? typeof collection.summary === "string"
        ? { en: [collection.summary] }
        : collection.summary
      : undefined,
    "hss:slug": slug,
    ...collection,
  } as any;
}
