import { CanvasPreviewBlock, type CanvasPreviewBlockProps } from "@/components/CanvasPreviewBlock";
import { BaseGridSection } from "@/components/shared/BaseGridSection";
import { getScrollLayoutConfig } from "@/helpers/scroll-layout";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { LocaleString } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";

export interface ScrollImageBlockProps {
  canvas: CanvasNormalized;
  id?: string;
  index: number;
  scrollEnabled?: boolean;
  objectLinks?: CanvasPreviewBlockProps["objectLinks"];
}

export function ScrollImageBlock({ canvas, id, index, scrollEnabled, objectLinks = [] }: ScrollImageBlockProps) {
  const layout = getScrollLayoutConfig(canvas.behavior ?? []);
  const overlaySideClass = layout.overlaySide === "left" ? "justify-start" : "justify-end";
  const overlayAlignClass = layout.overlayAlign === "top" ? "items-start" : "items-end";
  const splitOrderClass = layout.overlaySide === "left" ? "lg:flex-row" : "lg:flex-row-reverse";

  return (
    <BaseGridSection
      enabled={scrollEnabled}
      id={id || `${index}`}
      className={twMerge(
        "relative w-full bg-black",
        "min-h-screen",
        "overflow-hidden",
        layout.mode === "split" && "lg:flex",
        layout.mode === "split" && splitOrderClass,
      )}
    >
      <div className="relative h-full min-h-screen w-full min-w-0 flex-1">
        <div className="absolute inset-0">
          <CanvasPreviewBlock
            canvasId={canvas.id}
            cover
            index={index}
            objectLinks={objectLinks}
            // padding={layout.imagePadding}
            alternativeMode
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-black/0 to-black/55" />
      </div>

      {(layout.mode !== "none" && canvas.label) || canvas.summary ? (
        <div
          className={twMerge(
            layout.overlayWidthClass,
            layout.overlayContainerClass,
            layout.mode === "split" ? "h-full" : "pointer-events-none",
          )}
        >
          <div
            className={twMerge(
              "flex h-full w-full",
              layout.mode === "split" ? "items-center" : `${overlaySideClass} ${overlayAlignClass}`,
            )}
          >
            <div
              className={twMerge(
                "pointer-events-auto w-full",
                layout.mode === "floating" && layout.overlayWidthClass,
                layout.overlayPaddingClass,
                layout.overlayPanelClass,
                layout.mode === "floating" && "m-8 lg:m-12 rounded-2xl",
                layout.mode === "split" && "h-full",
              )}
            >
              <div className="flex h-full flex-col justify-center gap-4">
                {canvas.label ? (
                  <h2 className="text-2xl font-semibold leading-tight sm:text-3xl">
                    <LocaleString>{canvas.label}</LocaleString>
                  </h2>
                ) : null}
                {canvas.summary ? (
                  <div className="text-base leading-relaxed text-current/85">
                    <LocaleString>{canvas.summary}</LocaleString>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </BaseGridSection>
  );
}
