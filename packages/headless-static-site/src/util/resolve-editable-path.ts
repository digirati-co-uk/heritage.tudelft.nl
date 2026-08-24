import { join } from "node:path";
import { cwd } from "node:process";
import type { FileHandler } from "./file-handler";

function normalizeSlug(slug: string) {
  return slug
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/\/(manifest|collection)\.json$/i, "");
}

function stripResourcePrefix(slug: string, type: string | null) {
  if (type === "Manifest" && slug.startsWith("manifests/")) {
    return slug.slice("manifests/".length);
  }
  if (type === "Collection" && slug.startsWith("collections/")) {
    return slug.slice("collections/".length);
  }
  if (slug.startsWith("manifests/")) {
    return slug.slice("manifests/".length);
  }
  if (slug.startsWith("collections/")) {
    return slug.slice("collections/".length);
  }
  return slug;
}

export async function resolveEditablePathForSlug(fileHandler: FileHandler, buildDir: string, inputSlug: string) {
  const slug = normalizeSlug(inputSlug);
  if (!slug) {
    return null;
  }

  const editablePath = join(cwd(), buildDir, "meta", "editable.json");
  const editable = (await fileHandler.loadJson(editablePath, true)) as Record<string, string>;
  const directPath = editable[slug];
  if (typeof directPath === "string" && directPath.length > 0) {
    return directPath;
  }

  const siteMapPath = join(cwd(), buildDir, "meta", "sitemap.json");
  const siteMap = (await fileHandler.loadJson(siteMapPath, true)) as Record<string, any>;
  const siteMapEntry = siteMap[slug];
  if (!siteMapEntry || typeof siteMapEntry !== "object") {
    return null;
  }

  const source = siteMapEntry.source;
  if (!source || typeof source !== "object") {
    return null;
  }

  if (source.type === "disk") {
    const diskPath =
      typeof source.filePath === "string" && source.filePath.length > 0
        ? source.filePath
        : typeof source.path === "string" && source.path.endsWith(".json")
          ? source.path
          : null;
    return diskPath;
  }

  if (source.type === "remote") {
    const overridesFolder =
      typeof source.overrides === "string" && source.overrides.trim().length > 0 ? source.overrides.trim() : null;
    if (!overridesFolder) {
      return null;
    }

    const trimmedSlug = stripResourcePrefix(slug, typeof siteMapEntry.type === "string" ? siteMapEntry.type : null);
    return join(overridesFolder, `${trimmedSlug}.json`);
  }

  return null;
}
