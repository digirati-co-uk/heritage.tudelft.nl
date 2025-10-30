import { Suspense } from "react";
import {
  CanvasPreviewBlock,
  type CanvasPreviewBlockProps,
} from "../CanvasPreviewBlock";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { BaseExhibitionBlock } from "./BaseExhibitionBlock";

export interface ImageBlockProps extends CanvasPreviewBlockProps {
  id?: string;
  index: number;
  coverImages?: boolean;
  canvas: CanvasNormalized;
  scrollEnabled?: boolean;
}

export function ImageBlock({
  canvas,
  id,
  index,
  scrollEnabled,
  coverImages,
  ...props
}: ImageBlockProps) {

  const behavior = canvas?.behavior || [];

  return (
    <BaseExhibitionBlock id={id} index={index} scrollEnabled={scrollEnabled}>
      <Suspense fallback={<div className="h-full w-full" />}>
        <CanvasPreviewBlock
          index={index}
          canvasId={canvas.id}
          cover={
            coverImages ||
            behavior.includes("image-cover") ||
            behavior.includes("cover")
          }
          {...props}
        />
      </Suspense>
    </BaseExhibitionBlock>
  );
}
