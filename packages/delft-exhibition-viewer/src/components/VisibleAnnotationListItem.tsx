import type { Canvas } from "@iiif/presentation-3";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { LocaleString } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import type { ExhibitionStep } from "../helpers/exhibition-store";
import { useStepDetails } from "../helpers/use-step-details";

export function VisibleAnnotationsListingItem({
  canvas,
  step,
  stepIndex,
  index,
  goToStep,
  hoverProps,
}: {
  canvas: CanvasNormalized | Canvas;
  step: ExhibitionStep;
  stepIndex: number;
  index: number;
  hoverProps: any;
  goToStep: (step: number) => void;
}) {
  const { label, summary, isActive, showBody, showSummary, toShow } =
    useStepDetails(canvas, step);

  return (
    <div
      data-step-id={index}
      {...hoverProps}
      className="cursor-pointer mb-2"
      onClick={() => goToStep(index)}
    >
      <LocaleString
        as="h3"
        className={twMerge(
          "text-semibold hover:hover:underline",
          index === stepIndex ? "text-yellow-400" : "text-white",
        )}
      >
        {label}
      </LocaleString>
      <LocaleString
        as="div"
        className="text-white/50 text-sm whitespace-pre-wrap"
        enableDangerouslySetInnerHTML
      >
        {summary}
      </LocaleString>
      {showBody && toShow
        ? (toShow || []).map((body, n) => {
            if (body.type === "TextualBody") {
              return (
                <div
                  className={twMerge(
                    "text-white prose-sm exhibition-html",
                    "text-semibold hover:hover:underline",
                    index === stepIndex
                      ? "prose-headings:text-yellow-400"
                      : "text-white",
                  )}
                  key={n}
                >
                  <LocaleString enableDangerouslySetInnerHTML>
                    {body.value}
                  </LocaleString>
                </div>
              );
            }
            return null;
          })
        : null}
    </div>
  );
}
