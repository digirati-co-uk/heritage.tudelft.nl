import type { Annotation, Canvas } from "@iiif/presentation-3";
import type { AnnotationPageNormalized } from "@iiif/presentation-3-normalized";
import { useMemo } from "react";
import { expandTarget, useCanvas, useVault } from "react-iiif-vault";

export function useCanvasHighlights() {
  const canvas = useCanvas();
  const vault = useVault();
  return useMemo(() => {
    if (!canvas?.annotations[0]) return [];
    const page = vault.get<AnnotationPageNormalized>(canvas.annotations[0]);

    return page.items
      .map((ref) => {
        const annotation = vault.get<Annotation>(ref);

        const target = vault.get<Canvas | Annotation>(annotation.target as any);
        if (!target || target.type !== "Canvas") return null;

        return expandTarget(annotation.target as any);
      })
      .filter(Boolean);
  }, [canvas, vault]);
}
