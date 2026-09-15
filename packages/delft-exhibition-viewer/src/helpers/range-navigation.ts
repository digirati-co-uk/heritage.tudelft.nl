import type { RangeTableOfContentsNode } from "@iiif/helpers";
import type { InternationalString } from "@iiif/presentation-3";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { getCanvasNavigationHref, getCanvasNavigationId, parseCanvasNavigationIndex } from "./canvas-navigation";

export type TableOfContentsItem = {
  id: string;
  type: "Canvas" | "Range";
  label?: InternationalString | null;
  canvasId?: string;
  canvasIndex?: number;
  targetId: string;
  depth: number;
};

function getSpecificResourceCanvasId(resource: unknown): string | null {
  const source = (resource as { source?: { id?: string; type?: string } } | null)?.source;
  return source?.type === "Canvas" && source.id ? source.id : null;
}

function getCanvasIdFromNode(node: RangeTableOfContentsNode) {
  if (node.type === "Canvas") {
    return getSpecificResourceCanvasId(node.resource) || node.id;
  }

  return getSpecificResourceCanvasId(node.firstCanvas) || null;
}

function getStableLabelValue(label: InternationalString | string | null | undefined) {
  if (!label) return "";
  if (typeof label === "string") return label;

  const preferred = label.none || label.en;
  if (preferred?.length) {
    return preferred.join(" ");
  }

  for (const value of Object.values(label)) {
    if (value?.length) {
      return value.join(" ");
    }
  }

  return "";
}

function slugifyText(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getLastUrlSegment(id: string) {
  const cleanId = id.replace(/[?#].*$/, "").replace(/\/+$/, "");
  return cleanId.slice(cleanId.lastIndexOf("/") + 1);
}

function getTargetId(node: RangeTableOfContentsNode, parentSlugs: string[], usedTargetIds: Set<string>) {
  const labelSlug = slugifyText(getStableLabelValue(node.label));
  const idSlug = slugifyText(getLastUrlSegment(node.id));
  const baseSlug = labelSlug || idSlug || "range";
  const pathSlug = [...parentSlugs, baseSlug].join("-");
  let targetId = pathSlug || baseSlug;

  if (usedTargetIds.has(targetId)) {
    targetId = idSlug && idSlug !== targetId ? `${targetId}-${idSlug}` : `${targetId}-range`;
  }

  let counter = 2;
  const uniqueTargetId = targetId;
  while (usedTargetIds.has(targetId)) {
    targetId = `${uniqueTargetId}-${counter}`;
    counter++;
  }

  usedTargetIds.add(targetId);
  return { targetId, slug: baseSlug };
}

function flattenRangeItems(
  nodes: RangeTableOfContentsNode[],
  canvasIndexById: Map<string, number>,
  usedTargetIds: Set<string>,
  parentSlugs: string[] = [],
  depth = 0,
): TableOfContentsItem[] {
  const items: TableOfContentsItem[] = [];

  for (const node of nodes) {
    const canvasId = getCanvasIdFromNode(node);
    const canvasIndex = canvasId ? canvasIndexById.get(canvasId) : undefined;
    const target = node.type === "Range" ? getTargetId(node, parentSlugs, usedTargetIds) : null;

    if (node.type === "Range" && node.label && canvasIndex !== undefined) {
      items.push({
        id: node.id,
        type: node.type,
        label: node.label,
        canvasId,
        canvasIndex,
        targetId: target!.targetId,
        depth,
      });
    }

    if (node.items?.length) {
      const childSlugs = target ? [...parentSlugs, target.slug] : parentSlugs;
      items.push(...flattenRangeItems(node.items, canvasIndexById, usedTargetIds, childSlugs, depth + 1));
    }
  }

  return items;
}

export function createTableOfContentsItems(
  tree: RangeTableOfContentsNode | null | undefined,
  canvases: CanvasNormalized[],
): TableOfContentsItem[] {
  const canvasIndexById = new Map(canvases.map((canvas, index) => [canvas.id, index]));
  const reservedTargetIds = new Set(["top", ...canvases.map((_, index) => getCanvasNavigationId(index))]);

  if (tree?.items?.length) {
    const rangeItems = flattenRangeItems(tree.items, canvasIndexById, reservedTargetIds);
    if (rangeItems.length) {
      return rangeItems;
    }
  }

  return canvases.map((canvas, index) => ({
    id: canvas.id,
    type: "Canvas",
    label: canvas.label,
    canvasId: canvas.id,
    canvasIndex: index,
    targetId: getCanvasNavigationId(index),
    depth: 0,
  }));
}

function findCurrentTableOfContentsItemByCanvasIndex(items: TableOfContentsItem[], canvasIndex: number | null) {
  if (canvasIndex === null) return null;

  return items.reduce<TableOfContentsItem | null>((current, item) => {
    if (item.canvasIndex === undefined || item.canvasIndex > canvasIndex) {
      return current;
    }

    if (!current || item.canvasIndex > (current.canvasIndex ?? -1)) {
      return item;
    }

    if (item.canvasIndex === current.canvasIndex && item.depth >= current.depth) {
      return item;
    }

    return current;
  }, null);
}

export function findCurrentTableOfContentsItem(items: TableOfContentsItem[], hashValue: string | null) {
  const exactMatch = hashValue ? items.find((item) => item.targetId === hashValue) : null;
  if (exactMatch) return exactMatch;

  return findCurrentTableOfContentsItemByCanvasIndex(items, parseCanvasNavigationIndex(hashValue));
}

export function getTableOfContentsItemHref(item: TableOfContentsItem) {
  if (item.type === "Canvas" && item.canvasIndex !== undefined) {
    return getCanvasNavigationHref(item.canvasIndex);
  }

  return `#${item.targetId}`;
}

export function groupRangeItemsByCanvasIndex(items: TableOfContentsItem[]) {
  const groups = new Map<number, TableOfContentsItem[]>();

  for (const item of items) {
    if (item.type !== "Range" || item.canvasIndex === undefined) continue;
    const group = groups.get(item.canvasIndex) || [];
    group.push(item);
    groups.set(item.canvasIndex, group);
  }

  return groups;
}
