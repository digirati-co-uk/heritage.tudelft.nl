import type { Annotation, Canvas } from "@iiif/presentation-3";
import type { AnnotationPageNormalized } from "@iiif/presentation-3-normalized";
import { expandTarget, useCanvas, useVaultSelector } from "react-iiif-vault";

function normalizeStylesheet(value: string) {
  return value.replace(/\{\s*/g, "{ ");
}

function collectStylesheets(input: unknown, stylesheets: Record<string, string>) {
  if (!input) return;
  if (Array.isArray(input)) {
    input.forEach((item) => collectStylesheets(item, stylesheets));
    return;
  }
  if (typeof input === "object" && "value" in input && typeof input.value === "string") {
    const id = "id" in input && typeof input.id === "string" ? input.id : `stylesheet-${Object.keys(stylesheets).length}`;
    const value = normalizeStylesheet(input.value);
    const cacheKey = `${id}-${value}`;
    stylesheets[cacheKey] = value;
  }
}

function getLoadedStylesheets(...annotations: Annotation[]) {
  const stylesheets: Record<string, string> = {};

  annotations.forEach((annotation) => {
    collectStylesheets((annotation as any).stylesheet, stylesheets);
    const targets = Array.isArray(annotation.target) ? annotation.target : [annotation.target];
    targets.forEach((target) => collectStylesheets((target as any)?.stylesheet, stylesheets));
  });

  return Object.keys(stylesheets).length ? stylesheets : undefined;
}

function getHighlightTarget(target: unknown) {
  if (!target || typeof target !== "object" || Array.isArray(target)) return target;
  return Array.isArray((target as any).selector) && (target as any).selector.length === 1
    ? { ...(target as any), selector: (target as any).selector[0] }
    : target;
}

export function useCanvasHighlights() {
  const canvas = useCanvas();
  const annotationPage = canvas?.annotations[0];

  return useVaultSelector((_, vault) => {
    if (!annotationPage) return [];
    const page = vault.get<AnnotationPageNormalized>(annotationPage);
    if (!page?.items) return [];

    return page.items
      .map((ref) => {
        const annotation = vault.get<Annotation>(ref);
        if (!annotation?.target) return null;

        const target = vault.get<Canvas | Annotation>(annotation.target as any);
        if (!target) return null;

        if (target.type === "Annotation") {
          return {
            ...expandTarget(getHighlightTarget(target.target) as any, {
              loadedStylesheets: getLoadedStylesheets(annotation as any, target as any),
              styleClass: (annotation.target as any).styleClass,
            }),
            annotationId: target.id,
          };
        }

        if (target.type !== "Canvas") return null;

        return {
          ...expandTarget(getHighlightTarget(annotation.target) as any, {
            loadedStylesheets: getLoadedStylesheets(annotation as any),
          }),
          annotationId: annotation.id,
        };
      })
      .filter(Boolean);
  }, [annotationPage]);
}
