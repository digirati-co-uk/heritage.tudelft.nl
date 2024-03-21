"use client";

import { CanvasPanel } from "react-iiif-vault";

export function SimpleViewer() {
  return (
    <CanvasPanel.Viewer>
      <CanvasPanel.RenderCanvas />
    </CanvasPanel.Viewer>
  );
}
