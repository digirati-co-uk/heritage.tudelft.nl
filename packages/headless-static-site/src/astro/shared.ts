export type IIIFResourceType = "Manifest" | "Collection";

export type AstroParamsLike = Record<string, string | string[] | undefined>;

export type IIIFCollectionLike = {
  id?: string;
  type?: string;
  items?: Array<Record<string, any>>;
};

export type IIIFSitemapEntry = {
  type?: IIIFResourceType;
  source?: { type?: string; url?: string; path?: string; filePath?: string } | null;
  [key: string]: any;
};

export function normalizeSlug(input: string) {
  return input.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\/(manifest|collection)\.json$/i, "");
}

export function slugFromParams(params: AstroParamsLike, param = "slug") {
  const value = params[param];
  if (Array.isArray(value)) {
    return normalizeSlug(value.join("/"));
  }
  return normalizeSlug(value || "");
}

export function asAstroParam(slug: string, split = false) {
  const normalized = normalizeSlug(slug);
  if (split) {
    return normalized.length ? normalized.split("/") : [];
  }
  return normalized;
}

export function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function extractSlugFromResource(resource: Record<string, any>) {
  const direct = resource?.["hss:slug"];
  if (typeof direct === "string" && direct.trim().length > 0) {
    return normalizeSlug(direct);
  }

  const id = resource?.id;
  if (typeof id !== "string") {
    return "";
  }

  try {
    const parsed = new URL(id);
    return normalizeSlug(parsed.pathname);
  } catch (error) {
    return normalizeSlug(id);
  }
}

export function extractItemSlugs(collection: IIIFCollectionLike | null | undefined) {
  const seen = new Set<string>();
  const slugs: string[] = [];
  const items = collection?.items || [];

  for (const item of items) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const slug = extractSlugFromResource(item as Record<string, any>);
    if (!slug || seen.has(slug)) {
      continue;
    }
    seen.add(slug);
    slugs.push(slug);
  }

  return slugs;
}
