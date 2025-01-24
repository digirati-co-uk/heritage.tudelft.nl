import { CanvasPreviewBlock } from "./CanvasPreviewBlock";
import { AutoLanguage } from "../pages/AutoLanguage";
import { getClassName } from "@/helpers/exhibition";
import { twMerge } from "tailwind-merge";
import { Suspense } from "react";
import { Canvas } from "@iiif/presentation-3";
import { getValue } from "@iiif/helpers";

export async function ImageBlock({
  index,
  canvas,
  objectLinks,
}: {
  index: number;
  canvas: Canvas;
  objectLinks: Array<{ service: string; slug: string; canvasId: string; targetCanvasId: string }>;
}) {
  const behavior = canvas.behavior || [];
  const isLeft = behavior.includes("left");
  const isRight = behavior.includes("right");
  const isBottom = behavior.includes("bottom");

  const showSummary = Boolean(canvas.summary && (isLeft || isRight || isBottom));

  const className = getClassName(behavior);

  const canvasViewer = (
    <Suspense fallback={<div className="h-full w-full bg-red-700" />}>
      <CanvasPreviewBlock canvasId={canvas.id} cover={!showSummary} index={index} objectLinks={objectLinks} />
    </Suspense>
  );

  return (
    <div className={twMerge(className, "cut-corners relative", !showSummary && "aspect-square lg:aspect-auto")}>
      {showSummary ? (
        <div className={twMerge("h-full md:flex", isLeft && "flex-row-reverse", isBottom && "flex-col")}>
          <div
            className={twMerge(
              "cut-corners flex-1 md:w-2/3",
              isBottom && "w-full md:w-full",
              "aspect-square md:aspect-auto"
            )}
          >
            {canvasViewer}
          </div>
          <div
            className={twMerge(
              "cut-corners flex flex-col bg-black p-5 text-white md:w-1/3",
              isBottom && "w-full md:w-full"
            )}
          >
            <div className={twMerge("mb-4", isLeft && "place-self-end md:rotate-180")}>
              <svg
                className={twMerge(isBottom ? "rotate-90" : "rotate-90 md:rotate-0")}
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="#fff" />
              </svg>
            </div>
            <div className="mb-4 font-mono text-sm uppercase" id={getValue(canvas.label)}>
              <AutoLanguage>{canvas.label}</AutoLanguage>
            </div>
            <div className="exhibition-info-block">
              <div>
                <AutoLanguage lines>{canvas.summary}</AutoLanguage>
              </div>
              {canvas.requiredStatement && (
                <div className="">
                  <AutoLanguage>{canvas.requiredStatement.value}</AutoLanguage>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        canvasViewer
      )}
    </div>
  );
}
