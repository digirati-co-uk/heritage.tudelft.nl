import { type ExhibitionStep, useStepDetails } from "@/library";
import { useScrollTheme } from "@/theme/scroll-theme";
import { memo } from "react";
import { LocaleString, useCanvas } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";

export const ScrollTourAnnotation = memo(function ScrollTourAnnotation({ step }: { step: ExhibitionStep }) {
  const canvas = useCanvas()!;
  const { label, summary, showSummary, showBody, toShow } = useStepDetails(canvas, step);
  const { annotationBlock } = useScrollTheme();

  return (
    <div key={step.annotationId} className="h-screen w-full flex items-center prose-headings:mt-0">
      <div className={annotationBlock.className}>
        <LocaleString as="h3" className={twMerge("text-semibold hover:hover:underline")}>
          {label}
        </LocaleString>
        <LocaleString as="div" className="whitespace-pre-wrap text-sm opacity-50" enableDangerouslySetInnerHTML>
          {summary}
        </LocaleString>
        {showBody && toShow
          ? (toShow || []).map((body, n) => {
              if (body.type === "TextualBody") {
                return (
                  <div className={twMerge("prose-sm exhibition-html", "text-semibold")} key={n}>
                    <LocaleString enableDangerouslySetInnerHTML>{body.value}</LocaleString>
                  </div>
                );
              }
              return null;
            })
          : null}
        {step.objectLink ? (step.objectLink as any).component : null}
      </div>
    </div>
  );
});
