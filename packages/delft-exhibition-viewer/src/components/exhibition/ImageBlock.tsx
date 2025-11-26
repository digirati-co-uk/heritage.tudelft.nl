import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { Suspense } from "react";
import { CanvasPreviewBlock, type CanvasPreviewBlockProps } from "../CanvasPreviewBlock";
import { BaseExhibitionBlock } from "./BaseExhibitionBlock";

export interface ImageBlockProps extends CanvasPreviewBlockProps {
  id?: string;
  index: number;
  coverImages?: boolean;
  canvas: CanvasNormalized;
  scrollEnabled?: boolean;
  fullWidthGrid?: boolean;
}

export function ImageBlock({
  canvas,
  id,
  index,
  scrollEnabled,
  coverImages,
  fullWidthGrid,
  ...props
}: ImageBlockProps) {
  const behavior = canvas?.behavior || [];

  return (
    <BaseExhibitionBlock id={id} index={index} scrollEnabled={scrollEnabled} fullWidthGrid={fullWidthGrid}>
      <Suspense fallback={<div className="h-full w-full" />}>
        <CanvasPreviewBlock
          index={index}
          canvasId={canvas.id}
          cover={coverImages || behavior.includes("image-cover") || behavior.includes("cover")}
          {...props}
        />
      </Suspense>
    </BaseExhibitionBlock>
  );
}
