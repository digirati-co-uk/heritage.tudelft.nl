import type { CollectionItem, ResourceFilter } from "./types";

export function normalizeLabel(value: any) {
  if (!value) return "Untitled";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.find(Boolean) || "Untitled";
  for (const key of Object.keys(value)) {
    const candidate = value[key];
    if (Array.isArray(candidate) && candidate.length) {
      return candidate.find(Boolean) || "Untitled";
    }
  }
  return "Untitled";
}

export function detectDebugBase(pathname: string) {
  const marker = "/_debug";
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex === -1) return marker;
  return pathname.slice(0, markerIndex + marker.length);
}

export function getSlugPath(pathname: string, debugBase: string) {
  const relative = pathname.startsWith(debugBase)
    ? pathname.slice(debugBase.length)
    : pathname;
  const slug = relative.replace(/^\/+/, "").replace(/\/+$/, "");
  return decodeURIComponent(slug);
}

export function encodeSlugPath(slug: string) {
  return slug
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function getThumbnailId(value: any): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === "string") return first;
    return first?.id || first?.["@id"] || null;
  }
  if (typeof value === "string") return value;
  return value?.id || value?.["@id"] || null;
}

export function toResourceFilter(type: string | null): ResourceFilter {
  if (type === "Manifest") return "manifest";
  if (type === "Collection") return "collection";
  return "all";
}

export function getDiskPath(
  source: any,
  diskPath?: string | null,
  editablePath?: string | null,
) {
  return diskPath || editablePath || source?.filePath || source?.path || null;
}

export function isAbsolutePath(path: string) {
  return path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path);
}

export function toFileUrl(path: string) {
  return `file://${encodeURI(path)}`;
}

export function getMetaThumbnailId(meta: any): string | null {
  if (!meta || typeof meta !== "object") return null;
  const thumb = meta.thumbnail;
  if (!thumb || typeof thumb !== "object") return null;
  return thumb.id || thumb["@id"] || null;
}

export function getCollectionItems(resource: any): CollectionItem[] {
  const items = Array.isArray(resource?.items) ? resource.items : [];
  return items
    .map((item: any) => {
      const slug = item?.["hss:slug"];
      if (!slug || typeof slug !== "string") return null;
      return {
        id: item?.id || null,
        type: item?.type || null,
        slug,
        label: normalizeLabel(item?.label),
        thumbnail: getThumbnailId(item?.thumbnail),
      } satisfies CollectionItem;
    })
    .filter((item): item is CollectionItem => Boolean(item));
}
