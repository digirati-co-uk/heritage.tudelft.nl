import type { DefaultPresetOptions, Preset } from "@atlas-viewer/atlas";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { CanvasPanel, useCanvas } from "react-iiif-vault";
import { useExhibitionStep } from "@/helpers/exhibition-store";
import type { ObjectLink } from "@/helpers/object-links";
import { useCanvasHighlights } from "@/helpers/use-canvas-highlights";

interface CanvasPresentationBlockProps {
  canvasId: string;
  cover?: boolean;
  index: number;
  objectLinks: Array<ObjectLink>;
  fullWidth?: boolean;
}

export function CanvasPresentationBlock(props: CanvasPresentationBlockProps) {
  const canvas = useCanvas();
  const step = useExhibitionStep();
  const atlas = useRef<Preset | null>(null);
  const [isReady, setIsReady] = useState(false);
  const config = useMemo(
    () =>
      [
        "default-preset",
        {
          runtimeOptions: { visibilityRatio: 0.75, maxOverZoom: 3 },
          interactive: true,
        } as DefaultPresetOptions,
      ] as any,
    [],
  );

  const stepCurrent = step?.canvasId === props.canvasId ? step : null;
  const highlights = useCanvasHighlights();

  const shouldPreload =
    step?.canvasId === props.canvasId ||
    step?.previousCanvasId === props.canvasId ||
    step?.nextCanvasId === props.canvasId;

  const region = step?.region?.selector?.spatial;

  // biome-ignore lint/correctness/useExhaustiveDependencies: Needed for window size changes.
  useLayoutEffect(() => {
    if (atlas.current && isReady && stepCurrent) {
      if (
        step?.region?.selector?.type === "BoxSelector" ||
        step?.region?.selector?.type === "SvgSelector"
      ) {
        atlas.current.runtime.setHomePosition({
          ...(step.region?.selector?.spatial as any),
          padding: 50,
        });
      }
      if (step) {
        atlas.current?.runtime.world.goHome();
      }
    }
  }, [step, stepCurrent, isReady, props.fullWidth]);

  if (!canvas || !shouldPreload) {
    return null;
  }

  return (
    <div className="text-ImageCaption flex flex-col flex-1 min-w-0 min-h-0 h-full">
      <CanvasPanel.Viewer
        homePosition={region as any}
        renderPreset={config}
        resizeHash={props.fullWidth ? 1 : 2}
        homeOnResize
        onCreated={(preset) => {
          atlas.current = preset;
          const clear = preset.runtime.registerHook("useAfterFrame", () => {
            const renderers = (preset.renderer as any).renderers;
            const canvasRenderer = renderers[0]?.canvas ? renderers[0] : null;
            if (!canvasRenderer) {
              setIsReady(true);
              clear();
            }
            if ((canvasRenderer as any).isReady()) {
              preset.runtime.updateNextFrame();
              setTimeout(() => {
                setIsReady(true);
              }, 300);
              clear();
            }
          });
          setTimeout(() => preset.runtime.updateNextFrame(), 1000);
        }}
      >
        <CanvasPanel.RenderCanvas
          // ignoreSize
          strategies={["images"]}
          enableSizes={false}
        >
          {highlights.length > 1
            ? null
            : highlights.map((highlight, index) => {
                const target = highlight?.selector?.spatial as any;
                if (!target) return null;

                if (highlight?.selector?.type === "SvgSelector") {
                  const Shape = "shape" as any;
                  return (
                    <Shape
                      points={highlight?.selector.points}
                      relativeStyle={true}
                      target={{
                        x: 0,
                        y: 0,
                        width: canvas.width,
                        height: canvas.height,
                      }}
                      style={{
                        border: "2px solid red",
                      }}
                    />
                  );
                }

                return (
                  <box
                    key={index}
                    target={target}
                    relativeStyle
                    html
                    style={{ border: "2px dashed red" }}
                  />
                );
              })}
        </CanvasPanel.RenderCanvas>
      </CanvasPanel.Viewer>
    </div>
  );
}
