import type { DefaultPresetOptions, Preset } from "@atlas-viewer/atlas";
import { Dialog } from "@headlessui/react";
import { expandTarget } from "@iiif/helpers";
import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useHover } from "react-aria";
import { CanvasContext, CanvasPanel, useCanvas, useVault } from "react-iiif-vault";
import { LocaleString } from "react-iiif-vault";
import { LazyLoadComponent } from "react-lazy-load-image-component";
import { twMerge } from "tailwind-merge";
import invariant from "tiny-invariant";
import { useStore } from "zustand";
import { createExhibitionStore } from "../helpers/exhibition-store";
import { useCanvasHighlights } from "../helpers/use-canvas-highlights";
import { withViewTransition } from "../helpers/with-view-transition";
import { CloseIcon } from "./CloseIcon";
import { RenderSeeAlso } from "./RenderSeeAlso";
import { ViewerZoomControls } from "./ViewerZoomControls";
import { VisibleAnnotationsListingItem } from "./VisibleAnnotationListItem";
import { InfoIcon } from "./icons/InfoIcon";

function CanvasPreviewBlockInner({
  cover,
  index,
  autoPlay = false,
  objectLinks,
  alternativeMode,
  transitionScale = false,
  imageInfoIcon = false,
}: {
  cover?: boolean;
  autoPlay?: boolean;
  alternativeMode?: boolean;
  transitionScale?: boolean;
  imageInfoIcon?: boolean;
  index: number;
  objectLinks: Array<{
    service: string;
    slug: string;
    canvasId: string;
    targetCanvasId: string;
    component: ReactNode;
  }>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const vault = useVault();
  const canvas = useCanvas();
  const highlights = useCanvasHighlights();
  const store = useMemo(
    () =>
      createExhibitionStore({
        vault: vault as any,
        canvases: [canvas as any],
        objectLinks,
        firstStep: false,
      }),
    [vault, canvas],
  );

  const { currentStep, goToStep, isPlaying, nextStep, pause, play, playPause, previousStep, steps } = useStore(store);

  const step = currentStep === -1 ? null : steps[currentStep];

  useEffect(() => {
    if (isOpen && autoPlay) {
      play();
    }
    if (!isOpen) {
      goToStep(-1);
      pause();
    }
  }, [isOpen, autoPlay]);

  useEffect(() => {
    setHovered(null);
  }, [step]);

  const [hovered, setHovered] = useState<number | null>(null);

  const { hoverProps } = useHover({
    onHoverStart: (e) => {
      const stepIdx = e.target.dataset.stepId;
      if (typeof stepIdx !== "undefined" && stepIdx !== "") {
        const stepIndex = Number.parseInt(stepIdx, 10);
        setHovered(stepIndex);
      }
    },
    onHoverEnd: () => {
      setHovered(null);
    },
  });

  const { hoverProps: nextHoverProps } = useHover({
    onHoverStart: () => {
      if (currentStep !== -1 && steps[currentStep + 1]) {
        setHovered(currentStep + 1);
      }
    },
    onHoverEnd: () => {
      setHovered(null);
    },
  });
  const { hoverProps: previousHoverProps } = useHover({
    onHoverStart: () => {
      if (currentStep !== 0 && steps[currentStep - 1]) {
        setHovered(currentStep - 1);
      }
    },
    onHoverEnd: () => {
      setHovered(null);
    },
  });

  const atlas = useRef<Preset | null>(null);
  const [isReady, setIsReady] = useState(false);
  const config = useMemo(
    () =>
      [
        "default-preset",
        {
          runtimeOptions: { visibilityRatio: 0.5, maxOverZoom: 3 },
          interactive: isOpen,
        } as DefaultPresetOptions,
      ] as any,
    [isOpen],
  );

  const tour = currentStep !== -1;
  const stepIndex = currentStep;

  invariant(canvas);

  useLayoutEffect(() => {
    if (atlas.current && isReady && step) {
      if (step?.region?.selector?.type === "BoxSelector" || step?.region?.selector?.type === "SvgSelector") {
        atlas.current.runtime.world.gotoRegion({
          ...(step.region?.selector?.spatial as any),
          padding: 50,
        });
      } else if (step) {
        atlas.current?.runtime.world.goHome();
      }
    }
    if (currentStep === -1) {
      atlas.current?.runtime.world.goHome();
    }
  }, [step, currentStep, isReady]);

  const objectLink = useMemo(() => {
    if (objectLinks.length === 1) {
      return objectLinks[0];
    }

    return null;
  }, [objectLinks, stepIndex, tour]);

  return (
    <>
      <div
        ref={container}
        className={twMerge(
          "exhibition-canvas-panel z-10 h-full bg-ViewerBackground canvas-preview-transition",
          transitionScale && "hover:scale-105 transition-transform duration-1000",
        )}
        onClick={withViewTransition(container.current, () => setIsOpen(true), `canvas-preview-block-${index}`)}
      >
        <CanvasPanel.Viewer
          containerStyle={{
            height: "100%",
            pointerEvents: isOpen ? undefined : "none",
            // viewTransitionName: isOpen ? "" : `canvas-preview-block-${index}`,
          }}
          renderPreset={config}
          homeOnResize
          // False
          homeCover={cover}
          onCreated={(preset) => {
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
          <CanvasPanel.RenderCanvas strategies={["images"]} enableSizes={false}>
            {highlights.length > 1
              ? null
              : highlights.map((highlight, index) => {
                  const target = highlight?.selector?.spatial as any;
                  if (!target) return null;
                  return <box key={index} target={target} relativeStyle html style={{ border: "2px dashed red" }} />;
                })}
          </CanvasPanel.RenderCanvas>
        </CanvasPanel.Viewer>
      </div>
      {imageInfoIcon && (
        <div className="absolute top-4 right-4 z-20 text-ImageCaption text-2xl pointer-events-none">
          <InfoIcon />
        </div>
      )}
      <div className="absolute bottom-4 left-0 right-0 z-20 text-center font-mono text-sm text-ImageCaption">
        {canvas.requiredStatement ? (
          <div className="">
            <LocaleString className="image-caption-inline">{canvas.requiredStatement.value}</LocaleString>
          </div>
        ) : (
          <LocaleString className="image-caption-inline">{canvas.label}</LocaleString>
        )}
      </div>
      <Dialog
        className="relative z-50"
        open={isOpen}
        onClose={withViewTransition(container.current, () => setIsOpen(false), `canvas-preview-block-${index}`, true)}
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="safe-inset fill-height fixed inset-0 z-20 flex w-screen items-center md:p-4">
          <button
            type="button"
            className="absolute right-4 top-4 z-20 flex  h-16 w-16 items-center justify-center bg-CloseBackground text-CloseText hover:bg-CloseBackgroundHover"
            onClick={withViewTransition(
              container.current,
              () => setIsOpen(false),
              `canvas-preview-block-${index}`,
              true,
            )}
          >
            <CloseIcon fill="currentColor" />
          </button>
          <Dialog.Panel className="relative z-10 flex h-full w-full flex-col justify-center bg-InfoBlock text-InfoBlockText overflow-y-auto overflow-x-hidden md:rounded lg:flex-row">
            <div
              className="flex-shink-0 sticky top-0 z-20 min-h-0 flex-1 bg-ViewerBackground lg:relative lg:order-2 lg:min-w-0"
              style={{ viewTransitionName: isOpen ? `canvas-preview-block-${index}` : "" }}
            >
              {isOpen ? (
                <CanvasPanel.Viewer
                  onCreated={(ctx) => void (atlas.current = ctx)}
                  containerStyle={{ height: "100%", minHeight: 0 }}
                  runtimeOptions={config[1].runtimeOptions}
                  renderPreset={config}
                >
                  <CanvasPanel.RenderCanvas
                    strategies={["images"]}
                    enableSizes={false}
                    renderViewerControls={() => <ViewerZoomControls />}
                  >
                    {highlights.map((highlight, index) => {
                      const target = highlight?.selector?.spatial as any;
                      if (!target) return null;
                      return (
                        <box key={index} target={target} relativeStyle html style={{ border: "2px dashed red" }} />
                      );
                    })}

                    {steps.map((step, index) => {
                      if (step.region && step.region.selector?.spatial) {
                        const region = step.region.selector?.spatial as any;
                        if (
                          region.x === 0 &&
                          region.y === 0 &&
                          region.width === canvas?.width &&
                          region.height === canvas?.height
                        ) {
                          return null;
                        }

                        const isHovered = hovered === index;
                        return (
                          <box
                            key={`hover-overlays-${index}`}
                            target={step.region.selector.spatial as any}
                            relativeStyle
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              goToStep(index);
                            }}
                            html
                            style={
                              isHovered
                                ? {
                                    background: "rgba(255, 255, 255, .5)",
                                    outline: "2px solid rgb(250, 204, 21)",
                                    outlineOffset: "4px",
                                  }
                                : {
                                    background: "rgba(255, 255, 255, 0)",
                                    outline: "2px solid transparent",
                                    outlineOffset: "4px",
                                    ":hover": {
                                      outline: "2px solid rgb(250, 204, 21)",
                                    },
                                  }
                            }
                          />
                        );
                      }
                      return null;
                    })}
                  </CanvasPanel.RenderCanvas>
                </CanvasPanel.Viewer>
              ) : null}
            </div>
            {alternativeMode ? (
              <div className="z-10 max-h-[40vh] w-full overflow-y-auto text-InfoBlockText lg:order-1 lg:max-h-[100vh] lg:max-w-md">
                {canvas.label || canvas.summary || canvas.seeAlso?.length ? (
                  <div className="mb-4 bg-InfoBlock text-InfoBlockText px-8">
                    <div>
                      <LocaleString as="h2" className="sticky top-0 bg-InfoBlock pb-4 pt-6 font-mono delft-title">
                        {canvas.label}
                      </LocaleString>
                      <LocaleString className="whitespace-pre-wrap" enableDangerouslySetInnerHTML>
                        {canvas.summary}
                      </LocaleString>
                    </div>
                    {canvas.requiredStatement && (
                      <div className="mt-8 text-sm opacity-60">
                        <LocaleString>{canvas.requiredStatement.value}</LocaleString>
                      </div>
                    )}
                    {canvas.seeAlso?.length ? <RenderSeeAlso resource={canvas.seeAlso[0]} /> : null}
                  </div>
                ) : null}
                {steps.length > 1 ? (
                  <div className="flex flex-col gap-2 bg-InfoBlock text-InfoBlockText px-8 pb-8">
                    <h3 className="sticky top-0 bg-InfoBlock pb-4 pt-6 font-mono delft-title">Annotations</h3>
                    {steps.map((step, index) => {
                      return (
                        <VisibleAnnotationsListingItem
                          key={`step-${index}`}
                          canvas={canvas}
                          goToStep={goToStep}
                          hoverProps={hoverProps}
                          index={index}
                          step={step}
                          stepIndex={stepIndex}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : (
              <footer className="background-black flex flex-col items-center gap-8 p-8 text-white md:min-h-32 md:flex-row">
                <div className="flex-1">
                  {tour && step ? (
                    <div>
                      <LocaleString>{step.label}</LocaleString>
                      <LocaleString enableDangerouslySetInnerHTML className="whitespace-pre-wrap">
                        {step.summary}
                      </LocaleString>
                    </div>
                  ) : (
                    <div>
                      <LocaleString>{canvas.label}</LocaleString>
                      <LocaleString enableDangerouslySetInnerHTML className="whitespace-pre-wrap">
                        {canvas.summary}
                      </LocaleString>
                    </div>
                  )}
                </div>

                {!tour && objectLink ? objectLink.component : null}
                {tour && step && step.objectLink ? (step.objectLink as any).component : null}

                <div className="px-4">
                  {tour && step ? (
                    <div>
                      <div className="mb-2 font-mono">
                        {stepIndex + 1} / {steps.length}
                      </div>
                      <div className="relative h-2 w-16">
                        <div className="absolute inset-0 bg-gray-800" />
                        <div
                          className="absolute inset-0 bg-slate-100"
                          style={{
                            width: `${((stepIndex + 1) / steps.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
                <div>
                  {currentStep !== -1 ? (
                    <div className="flex gap-3">
                      <button
                        {...previousHoverProps}
                        className="flex items-center gap-2 font-mono underline underline-offset-4"
                        onClick={() => previousStep()}
                      >
                        <svg className="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="#fff" />
                        </svg>
                        {stepIndex > 0 ? "Previous" : "End tour"}
                      </button>
                      <button
                        {...nextHoverProps}
                        className="flex items-center gap-2 font-mono underline underline-offset-4"
                        onClick={() => {
                          if (stepIndex + 1 < steps.length) {
                            nextStep();
                          } else {
                            goToStep(-1);
                          }
                        }}
                      >
                        {stepIndex + 1 < steps.length ? "Next" : "End tour"}
                        <svg
                          className="rotate-180"
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                        >
                          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="#fff" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    steps.length > 0 && (
                      <button className="font-mono underline underline-offset-4" onClick={() => nextStep()}>
                        Start tour
                      </button>
                    )
                  )}
                </div>
              </footer>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}

export function CanvasPreviewBlock({
  canvasId,
  cover,
  index,
  autoPlay,
  objectLinks,
  alternativeMode,
  transitionScale,
  imageInfoIcon,
}: {
  canvasId: string;
  cover?: boolean;
  index: number;
  autoPlay?: boolean;
  alternativeMode?: boolean;
  transitionScale?: boolean;
  imageInfoIcon?: boolean;
  objectLinks: Array<{
    service: string;
    slug: string;
    canvasId: string;
    targetCanvasId: string;
    component: ReactNode;
  }>;
}) {
  const inner = (
    <CanvasContext canvas={canvasId} key={canvasId}>
      <CanvasPreviewBlockInner
        cover={cover}
        objectLinks={objectLinks}
        autoPlay={autoPlay}
        alternativeMode={alternativeMode}
        transitionScale={transitionScale}
        imageInfoIcon={imageInfoIcon}
        index={index}
      />
    </CanvasContext>
  );

  if (index < 3) {
    return <div className="relative h-full w-full bg-ViewerBackground">{inner}</div>;
  }

  return (
    <div className="relative h-full w-full bg-ViewerBackground">
      <LazyLoadComponent placeholder={<div />} visibleByDefault={false} threshold={300}>
        {inner}
      </LazyLoadComponent>
    </div>
  );
}
