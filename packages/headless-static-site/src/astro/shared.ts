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

export type StaticPathStripPrefix = boolean | string | string[];

export type AstroIiifRoutes = {
  manifests?: string;
  collections?: string;
};

export type ResolvedAstroIiifRoutes = {
  manifests: string;
  collections: string;
};

export type ExtractItemSlugsOptions = {
  type?: IIIFResourceType;
  stripPrefix?: StaticPathStripPrefix;
  routes?: AstroIiifRoutes;
};

export function normalizeSlug(input: string) {
  return input
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/\/(manifest|collection)\.json$/i, "");
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

function normalizeRouteSegment(value: string | undefined, fallback: "manifests" | "collections") {
  const normalized = normalizeSlug(value || fallback);
  return normalized || fallback;
}

export function resolveAstroIiifRoutes(routes?: AstroIiifRoutes): ResolvedAstroIiifRoutes {
  return {
    manifests: normalizeRouteSegment(routes?.manifests, "manifests"),
    collections: normalizeRouteSegment(routes?.collections, "collections"),
  };
}

function normalizeItemType(type: unknown): IIIFResourceType | null {
  if (type === "Manifest" || type === "sc:Manifest") {
    return "Manifest";
  }
  if (type === "Collection" || type === "sc:Collection") {
    return "Collection";
  }
  return null;
}

function prefixesToStrip(
  type: IIIFResourceType | undefined,
  stripPrefix: StaticPathStripPrefix | undefined,
  routes?: AstroIiifRoutes
) {
  const resolvedRoutes = resolveAstroIiifRoutes(routes);
  const manifestPrefixes = Array.from(new Set(["manifests", resolvedRoutes.manifests]));
  const collectionPrefixes = Array.from(new Set(["collections", resolvedRoutes.collections]));

  if (Array.isArray(stripPrefix)) {
    return stripPrefix.map((prefix) => normalizeSlug(prefix)).filter(Boolean);
  }

  if (typeof stripPrefix === "string") {
    const normalized = normalizeSlug(stripPrefix);
    return normalized ? [normalized] : [];
  }

  if (!stripPrefix) {
    return [];
  }

  if (type === "Manifest") {
    return manifestPrefixes;
  }

  if (type === "Collection") {
    return collectionPrefixes;
  }

  return [...manifestPrefixes, ...collectionPrefixes];
}

export function normalizeSlugForStaticPath(
  slug: string,
  {
    type,
    stripPrefix,
    routes,
  }: { type?: IIIFResourceType; stripPrefix?: StaticPathStripPrefix; routes?: AstroIiifRoutes } = {}
) {
  const normalized = normalizeSlug(slug);
  const prefixes = prefixesToStrip(type, stripPrefix, routes);

  for (const prefix of prefixes) {
    if (normalized === prefix) {
      return "";
    }
    if (normalized.startsWith(`${prefix}/`)) {
      return normalized.slice(prefix.length + 1);
    }
  }

  return normalized;
}

export function getResourceSlugCandidates(slug: string, type?: IIIFResourceType | null, routes?: AstroIiifRoutes) {
  const normalized = normalizeSlug(slug);
  const candidates = [normalized];
  const resolvedRoutes = resolveAstroIiifRoutes(routes);
  const manifestPrefixes = Array.from(new Set(["manifests", resolvedRoutes.manifests]));
  const collectionPrefixes = Array.from(new Set(["collections", resolvedRoutes.collections]));

  if (!normalized) {
    return candidates;
  }

  const addCandidate = (prefix: string) => {
    const candidate = `${prefix}/${normalized}`;
    if (!candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  };

  if (type === "Manifest") {
    for (const prefix of manifestPrefixes) {
      if (!normalized.startsWith(`${prefix}/`)) {
        addCandidate(prefix);
      }
    }
    return candidates;
  }

  if (type === "Collection") {
    for (const prefix of collectionPrefixes) {
      if (!normalized.startsWith(`${prefix}/`)) {
        addCandidate(prefix);
      }
    }
    return candidates;
  }

  for (const prefix of manifestPrefixes) {
    if (!normalized.startsWith(`${prefix}/`)) {
      addCandidate(prefix);
    }
  }
  for (const prefix of collectionPrefixes) {
    if (!normalized.startsWith(`${prefix}/`)) {
      addCandidate(prefix);
    }
  }

  return candidates;
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

export function extractItemSlugs(
  collection: IIIFCollectionLike | null | undefined,
  options: ExtractItemSlugsOptions = {}
) {
  const seen = new Set<string>();
  const slugs: string[] = [];
  const items = collection?.items || [];
  const requestedType = options.type;

  for (const item of items) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const itemType = normalizeItemType((item as any).type || (item as any)["@type"]);
    let slug = extractSlugFromResource(item as Record<string, any>);

    if (requestedType && itemType && itemType !== requestedType) {
      continue;
    }
    if (requestedType && !itemType) {
      if (requestedType === "Manifest" && slug.startsWith("collections/")) {
        continue;
      }
      if (requestedType === "Collection" && slug.startsWith("manifests/")) {
        continue;
      }
    }

    slug = normalizeSlugForStaticPath(slug, {
      type: requestedType,
      stripPrefix: options.stripPrefix,
      routes: options.routes,
    });

    if (!slug || seen.has(slug)) {
      continue;
    }
    seen.add(slug);
    slugs.push(slug);
  }

  return slugs;
}
