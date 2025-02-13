import { Suspense } from "react";
import {
  CanvasContext,
  LocaleString,
  useAnnotation,
  useIIIFLanguage,
} from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { getClassName } from "../helpers/exhibition";
import { useExhibitionStep } from "../helpers/exhibition-store";
import { BaseSlide, type BaseSlideProps } from "./BaseSlide";
import { CanvasExhibitionBlock } from "./CanvasExhibitionBlock";
import { CanvasPreviewBlock } from "./CanvasPreviewBlock";
import type { ImageBlockProps } from "./ImageBlock";

export function ImageBlockPresentation({
  canvas,
  objectLinks,
  ...props
}: ImageBlockProps & BaseSlideProps) {
  const locale = useIIIFLanguage();
  const behavior = canvas.behavior || [];
  const isLeft = behavior.includes("left");
  const isRight = behavior.includes("right");
  const isBottom = behavior.includes("bottom");
  const step = useExhibitionStep();

  const isActive = step?.canvasId === canvas.id;
  const region = step?.region;

  const textualBodies = region
    ? step?.body.filter((t) => t.type === "TextualBody")
    : [];
  const showSummary =
    Boolean(canvas.summary && (isLeft || isRight || isBottom)) ||
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

  const canvasViewer = (
    <Suspense fallback={<div className="h-full w-full" />}>
      <CanvasContext canvas={canvas.id}>
        <CanvasExhibitionBlock
          fullWidth={!showSummary}
          canvasId={canvas.id}
          cover={false}
          index={props.index}
          objectLinks={objectLinks}
        />
      </CanvasContext>
    </Suspense>
  );

  return (
    <BaseSlide
      className={"mb-8 bg-black"}
      index={props.index}
      active={props.active}
    >
      <div
        className={twMerge(
          "h-full md:flex",
          isLeft && "flex-row-reverse",
          isBottom && "flex-col",
        )}
      >
        <div
          className={twMerge(
            "cut-corners flex-1 md:w-2/3",
            isBottom && "w-full md:w-full",
            "aspect-square md:aspect-auto",
            !showSummary && "w-full md:w-full",
          )}
        >
          {canvasViewer}
        </div>
        <div
          className={twMerge(
            "cut-corners flex flex-col bg-black p-5 text-white md:w-1/3",
            isBottom && "w-full md:w-full",
            isActive ? "opacity-100" : "opacity-0",
            !showSummary && "hidden",
          )}
        >
          <div
            className={twMerge(
              "mb-4",
              isLeft && "place-self-end md:rotate-180",
            )}
          >
            <svg
              className={twMerge(
                isBottom ? "rotate-90" : "rotate-90 md:rotate-0",
              )}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <title>Arrow</title>
              <path
                d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
                fill="#fff"
              />
            </svg>
          </div>
          <div className="mb-4 font-mono text-sm uppercase">
            <LocaleString>{label}</LocaleString>
          </div>
          <div
            className={twMerge(
              "exhibition-info-block overflow-y-auto",
              isActive ? "opacity-100" : "opacity-0",
            )}
          >
            <div>
              <LocaleString>{summary}</LocaleString>
            </div>
            {showBody && toShow
              ? (toShow || []).map((body, n) => {
                  if (body.type === "TextualBody") {
                    return (
                      <div
                        className="text-white prose-sm exhibition-html"
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
            {canvas.requiredStatement && (
              <div className="">
                <LocaleString>{canvas.requiredStatement.value}</LocaleString>
              </div>
            )}
          </div>
        </div>
      </div>
    </BaseSlide>
  );
}
