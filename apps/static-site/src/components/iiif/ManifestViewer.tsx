"use client";

import { useRef, useEffect } from "react";
import { useSimpleViewer, CanvasPanel } from "react-iiif-vault";
import { ViewerSliderControls } from "./ViewerSliderControls";
import { ViewerZoomControls } from "./ViewerZoomControls";
import type { Preset, RuntimeOptions } from "@atlas-viewer/atlas";

export default function ManifestViewer({
  manifest,
  initialCanvasIndex,
  runtimeOptions,
}: {
  manifest: { id: string };
  initialCanvasIndex: number;
  runtimeOptions?: Partial<RuntimeOptions>;
}) {
  const context = useSimpleViewer();
  const { currentSequenceIndex } = context;
  const previousSeqIndex = useRef(currentSequenceIndex);
  const atlas = useRef<Preset>();

  // biome-ignore lint/correctness/useExhaustiveDependencies: Needs to run when currentSequenceIndex changes.
  useEffect(() => {
    if (currentSequenceIndex == previousSeqIndex.current) {
      context.setCurrentCanvasIndex(initialCanvasIndex);
    } else {
      context.setCurrentCanvasIndex(currentSequenceIndex);
    }
    if (atlas.current) {
      setTimeout(() => atlas.current?.runtime.world.goHome(true), 5);
    }
  }, [currentSequenceIndex]);

  return (
    <>
      <CanvasPanel.Viewer
        onCreated={(preset) => {
          atlas.current = preset;
        }}
        htmlChildren={null}
        key={manifest.id}
        runtimeOptions={runtimeOptions}
      >
        <CanvasPanel.RenderCanvas
          strategies={["3d-model", "images", "textual-content", "media"]}
          renderViewerControls={ViewerZoomControls}
        />
      </CanvasPanel.Viewer>
      <ViewerSliderControls />
    </>
  );
}
