import type { Canvas } from "@iiif/presentation-3";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { useIIIFLanguage } from "react-iiif-vault";
import type { ExhibitionStep } from "./exhibition-store";

export function useStepDetails(
  canvas: CanvasNormalized | Canvas,
  step: ExhibitionStep | null,
) {
  const locale = useIIIFLanguage();
  const behavior = canvas.behavior || [];
  const isLeft = behavior.includes("left");
  const isRight = behavior.includes("right");
  const isBottom = behavior.includes("bottom");
  const isTop = behavior.includes("top");

  const isActive = step?.canvasId === canvas.id;
  const region = step?.region;
  const textualBodies = region
    ? step?.body.filter((t) => t.type === "TextualBody")
    : [];
  const showSummary =
    Boolean(canvas.summary && (isLeft || isRight || isBottom || isTop)) ||
    (isActive && region && step.label) ||
    (region && textualBodies.length > 0);

  const label = region ? step?.label : canvas.label;
  const summary = region ? step?.summary : canvas.summary;

  const showBody = !(label && summary);
  const toShow = showBody
    ? step?.body.length === 1
      ? step?.body || []
      : step?.body.filter((t: any) => (t as any).language === locale)
    : [];

  return {
    isActive,
    label,
    summary,
    showSummary,
    showBody,
    toShow,
    isLeft,
    isRight,
    isBottom,
    isTop,
  };
}
