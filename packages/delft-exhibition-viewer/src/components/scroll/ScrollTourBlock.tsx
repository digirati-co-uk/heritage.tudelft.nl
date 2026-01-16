import { createExhibitionStore } from "@/helpers/exhibition-store";
import type { Runtime } from "@atlas-viewer/atlas";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LocaleString, useAtlasStore, useCanvas, useVault, useViewportTour } from "react-iiif-vault";
import { useStore } from "zustand";
import { CanvasPreviewBlock, type CanvasPreviewBlockProps } from "../CanvasPreviewBlock";
import { ScrollImageBlock } from "./ScrollImageBlock";

export interface ScrollTourBlockProps {
  canvas: CanvasNormalized;
  id?: string;
  index: number;
  scrollEnabled?: boolean;
  objectLinks?: CanvasPreviewBlockProps["objectLinks"];
}

export function ScrollTourBlock(props: ScrollTourBlockProps) {
  const vault = useVault();
  const canvas = useCanvas();
  const store = useMemo(
    () =>
      createExhibitionStore({
        vault: vault as any,
        canvases: [canvas as any],
        objectLinks: [],
        firstStep: false,
      }),
    [vault, canvas],
  );
  const paintingPage = canvas?.items[0] ? vault.get(canvas.items[0]) : null;
  const hasMultipleAnnotations = (paintingPage?.items.length || 0) > 1;
  const { currentStep, goToStep, nextStep, pause, play, previousStep, steps } = useStore(store);

  const initial = useMemo(() => ({ x: 0, y: 0, width: canvas?.width || 0, height: canvas?.height || 0 }), [canvas]);

  const container = useRef<HTMLDivElement>(null);
  const [initialPagePosition, setInitialPagePosition] = useState(0);
  const [annotationWindowWidth, setAnnotationWindowWidth] = useState(0);

  useLayoutEffect(() => {
    const $container = container.current;

    if ($container) {
      setInitialPagePosition($container.offsetTop || 0);

      const $list = $container.querySelector("[data-annotation-list]");
      if ($list) {
        const { width } = $list.getBoundingClientRect();
        setAnnotationWindowWidth(width);
      }
    }
  }, []);

  const regions = useMemo(() => {
    return steps.map((step) => {
      return step.region?.selector?.spatial;
    });
  }, [steps]).filter(Boolean);

  const tour = useViewportTour({
    initial,
    regions,
    getProgress: () => {
      const height = container?.current?.getBoundingClientRect();
      if (!height) {
        return 0;
      }
      return (window.scrollY - initialPagePosition) / window.innerHeight;
    },
    // getProgress: typeof progressSource === "function" ? (progressSource as () => number) : undefined,
    // progress: typeof progressSource === "number" ? (progressSource as number) : undefined,
    // enabled,
    // easing,
    reportEveryFrame: true,
    // loop,
    // onEnter,
    // onExit,
    onProgress: () => {
      //
    },
    // jumpTo: jumpToProp,
  });

  const atlasStore = useAtlasStore();
  const [runtime, setRuntime] = useState<Runtime | null>(null);

  useEffect(() => {
    if (!runtime) return;
    if (!tour.rect) return;

    const padding = 50;

    runtime.world.gotoRegion({
      ...tour.rect,
      padding,
      // paddingPx:
      //   tour.currentIndex === 0
      //     ? undefined
      //     : { left: annotationWindowWidth, top: padding, bottom: padding, right: padding },
    });
  }, [runtime, tour.rect]);

  if (!canvas) return null;

  return (
    <div ref={container} className="bg-slate-500 text-black min-h-screen relative">
      <div className="image z-10 h-screen bg-[red] sticky top-0 pointer-events-none">
        <CanvasPreviewBlock
          interactive
          setRuntime={setRuntime}
          canvasId={canvas.id}
          index={props.index}
          objectLinks={[]}
          // padding={layout.imagePadding}
          alternativeMode
          disablePopup
        />
      </div>
      <div className="placeholder">
        {steps.map((step) => {
          return <div key={step.annotationId} className="h-screen" />;
        })}
      </div>
      <div className="steps absolute bottom-0 z-20" data-annotation-list="true">
        {steps.map((step) => {
          return (
            <div key={step.annotationId} className="h-screen w-full flex items-center">
              <div className="p-8 bg-black/50 w-1/2 m-8 overflow-hidden text-white">
                <LocaleString>{step.label}</LocaleString>
                <LocaleString enableDangerouslySetInnerHTML className="whitespace-pre-wrap">
                  {step.summary}
                </LocaleString>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
