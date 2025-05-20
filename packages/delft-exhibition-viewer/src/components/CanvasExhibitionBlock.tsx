import type { DefaultPresetOptions, Preset } from "@atlas-viewer/atlas";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  CanvasContext,
  CanvasPanel,
  useCanvas,
  useVault,
} from "react-iiif-vault";
import { useExhibition, useExhibitionStep } from "../helpers/exhibition-store";
import type { ObjectLink } from "../helpers/object-links";
import { useCanvasHighlights } from "../helpers/use-canvas-highlights";

interface CanvasExhibitionBlockProps {
  canvasId: string;
  cover?: boolean;
  index: number;
  objectLinks: Array<ObjectLink>;
  fullWidth?: boolean;
}

export function CanvasExhibitionBlock(props: CanvasExhibitionBlockProps) {
  const canvas = useCanvas();
  const step = useExhibitionStep();
  const atlas = useRef<Preset | null>(null);
  const [isReady, setIsReady] = useState(false);
  const config = useMemo(
    () =>
      [
        "default-preset",
        {
          runtimeOptions: { visibilityRatio: 0.5, maxOverZoom: 3 },
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

  useLayoutEffect(() => {
    if (atlas.current && isReady && stepCurrent) {
      if (
        step?.region?.selector?.type === "BoxSelector" ||
        step?.region?.selector?.type === "SvgSelector"
      ) {
        atlas.current.runtime.world.gotoRegion({
          ...(step.region?.selector?.spatial as any),
          padding: 50,
        });
      } else if (step) {
        atlas.current?.runtime.world.goHome();
      }
    }
  }, [stepCurrent, isReady, props.fullWidth]);

  useEffect(() => {
    atlas.current?.runtime.world.recalculateWorldSize();
  }, [props.fullWidth]);

  if (!canvas || !shouldPreload) {
    return null;
  }

  return (
    <div className="text-ImageCaption flex flex-col flex-1 min-w-0 min-h-0 h-full">
      <CanvasPanel.Viewer
        key={props.fullWidth ? 1 : 2}
        containerStyle={{
          height: "100%",
          width: "100%",
          // pointerEvents: isOpen ? undefined : "none",
        }}
        renderPreset={config}
        homeOnResize
        // homeCover={cover ? "start" : false}
        // onCreated={(ctx) => void (atlas.current = ctx)}
        onCreated={(preset) => {
          atlas.current = preset;
          atlas.current.em?.updateBounds();
          // Set position.
          if (
            step?.region?.selector?.type === "BoxSelector" ||
            step?.region?.selector?.type === "SvgSelector"
          ) {
            atlas.current.runtime.world.gotoRegion({
              ...(step.region?.selector?.spatial as any),
              padding: 50,
            });
          } else if (step) {
            atlas.current?.runtime.world.goHome();
          }

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
