"use client";

import { CanvasContext as OriginalCanvasContext } from "react-iiif-vault";

export function CanvasContext({ canvas, children }: { canvas: string; children: React.ReactNode }) {
  return <OriginalCanvasContext canvas={canvas}>{children}</OriginalCanvasContext>;
}
