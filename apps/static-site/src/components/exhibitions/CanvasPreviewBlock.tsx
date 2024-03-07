"use client";

import { DefaultPresetOptions, Preset } from "@atlas-viewer/atlas";
import { useState, useRef, useMemo, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { useCanvas, CanvasPanel, CanvasContext, useVault } from "react-iiif-vault";
import invariant from "tiny-invariant";
import { AutoLanguage } from "../pages/AutoLanguage";
import { LazyLoadComponent } from "react-lazy-load-image-component";
import { CloseIcon } from "../atoms/CloseIcon";
import { Canvas, Annotation } from "@iiif/presentation-3";
import { expandTarget } from "@iiif/helpers";
import { AnnotationPageNormalized } from "@iiif/presentation-3-normalized";
import { Link } from "@/navigation";

function CanvasPreviewBlockInner({
  cover,
  objectLinks,
}: {
  cover?: boolean;
  objectLinks: Array<{ service: string; slug: string; canvasId: string; targetCanvasId: string }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const vault = useVault();
  const canvas = useCanvas();
  const atlas = useRef<Preset | null>(null);
  const config = useMemo(
    () =>
      [
        "default-preset",
        { runtimeOptions: { visibilityRatio: 1.2, maxOverZoom: 2 }, interactive: isOpen } as DefaultPresetOptions,
      ] as any,
    [isOpen]
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [tour, setTour] = useState(false);

  invariant(canvas);

  const annotations = canvas.annotations[0] ? vault.get(canvas.annotations[0]) : null;

  const highlights = useMemo(() => {
    if (!canvas.annotations[0]) return [];
    const page = vault.get<AnnotationPageNormalized>(canvas.annotations[0]);

    return page.items
      .map((ref) => {
        const annotation = vault.get<Annotation>(ref);

        const target = vault.get<Canvas | Annotation>(annotation.target as any);
        if (!target || target.type !== "Canvas") return null;

        return expandTarget(annotation.target as any);
      })
      .filter(Boolean);
  }, [canvas]);

  const objectLink = useMemo(() => {
    if (objectLinks.length === 1) {
      return objectLinks[0];
    }

    return null;
  }, [objectLinks, stepIndex, tour]);

  const tourSteps = useMemo(() => {
    if (!annotations) return [];
    return annotations.items.map((item) => {
      const annotation = vault.get<Annotation>(item);
      const target = vault.get<Canvas | Annotation>(annotation.target as any);
      if (!target) return null;

      if (target.type === "Canvas") {
        return {
          label: annotation.label,
          summary: annotation.summary,
          target: expandTarget(annotation.target as any),
          objectLink: null,
        };
      }

      let imageService: null | string = null;
      if (target.body) {
        const body = vault.get(target.body);
        console.log(body);
        if (body[0] && body[0].service && body[0].service[0]) {
          imageService = body[0].service[0].id || body[0].service[0]["@id"];
        }
      }

      const objectLink = imageService ? objectLinks.find((link) => link.service === imageService) : null;

      return {
        label: target.label,
        summary: target.summary,
        target: expandTarget(target.target),
        objectLink,
      };
    });
  }, [annotations]);

  const step = tourSteps[stepIndex];

  useEffect(() => {
    if (!isOpen) {
      setTour(false);
      setStepIndex(0);
    }
    if (atlas.current) {
      if (tour) {
        if (step && step.target.selector && step.target.selector.type === "BoxSelector") {
          atlas.current.runtime.world.gotoRegion(step.target.selector?.spatial);
        }
      } else {
        atlas.current.runtime.world.goHome();
      }
    }
  }, [step, tour, isOpen]);

  return (
    <>
      <div className="exhibition-canvas-panel z-10 h-full bg-[#373737]" onClick={() => setIsOpen(true)}>
        <CanvasPanel.Viewer
          containerStyle={{ height: "100%", pointerEvents: isOpen ? undefined : "none" }}
          renderPreset={config}
          homeOnResize
          homeCover={cover ? "start" : false}
        >
          <CanvasPanel.RenderCanvas strategies={["images"]}>
            {highlights.map((highlight, index) => {
              const target = highlight?.selector?.spatial as any;
              if (!target) return null;
              return <box key={index} target={target} relativeStyle html style={{ border: "2px dashed red" }} />;
            })}
          </CanvasPanel.RenderCanvas>
        </CanvasPanel.Viewer>
      </div>
      <div className="absolute bottom-4 left-0 right-0 z-20 text-center font-mono text-sm text-white">
        <AutoLanguage>{canvas.label}</AutoLanguage>
      </div>
      <Dialog className="relative z-50" open={isOpen} onClose={() => setIsOpen(false)}>
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 z-20 flex h-screen w-screen items-center p-4">
          <button
            className="absolute right-4 top-4 z-20 flex  h-16 w-16 items-center justify-center bg-black hover:bg-gray-900"
            onClick={() => setIsOpen(false)}
          >
            <CloseIcon fill="#fff" />
          </button>
          <Dialog.Panel className="relative z-10 flex h-full w-full flex-col justify-center overflow-y-auto overflow-x-hidden rounded bg-black">
            <div className="min-h-0 flex-1 bg-[#373737]">
              {isOpen ? (
                <CanvasPanel.Viewer
                  onCreated={(ctx) => void (atlas.current = ctx)}
                  containerStyle={{ height: "100%", minHeight: 0 }}
                  renderPreset={config}
                >
                  <CanvasPanel.RenderCanvas strategies={["images"]} />
                </CanvasPanel.Viewer>
              ) : null}
            </div>
            <footer className="background-black flex flex-col items-center gap-8 p-8 text-white md:min-h-32 md:flex-row">
              <div className="flex-1">
                {tour && step ? (
                  <div>
                    <AutoLanguage>{step.label}</AutoLanguage>
                    <AutoLanguage>{step.summary}</AutoLanguage>
                  </div>
                ) : (
                  <div>
                    <AutoLanguage>{canvas.label}</AutoLanguage>
                    <AutoLanguage>{canvas.summary}</AutoLanguage>
                  </div>
                )}
              </div>
              {!tour && objectLink ? (
                <Link
                  href={`/${objectLink.slug}${objectLink ? `?canvasId=${btoa(objectLink.targetCanvasId)}` : ""}`}
                  className="underline underline-offset-4"
                >
                  View object
                </Link>
              ) : null}
              {tour && step && step.objectLink ? (
                <Link
                  href={`/${step.objectLink.slug}?canvasId=${btoa(step.objectLink.targetCanvasId)}`}
                  className="font-mono underline underline-offset-4"
                >
                  View object
                </Link>
              ) : null}
              <div className="px-4">
                {tour && step ? (
                  <div>
                    <div className="mb-2 font-mono">
                      {stepIndex + 1} / {tourSteps.length}
                    </div>
                    <div className="relative h-2 w-16">
                      <div className="absolute inset-0 bg-gray-800" />
                      <div
                        className="absolute inset-0 bg-slate-100"
                        style={{ width: `${((stepIndex + 1) / tourSteps.length) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              <div>
                {tour && step ? (
                  <div className="flex gap-3">
                    <button
                      className="flex items-center gap-2 font-mono underline underline-offset-4"
                      onClick={() => {
                        if (stepIndex > 0) {
                          setStepIndex(stepIndex - 1);
                        } else {
                          setTour(false);
                        }
                      }}
                    >
                      <svg className="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="#fff" />
                      </svg>
                      {stepIndex > 0 ? "Previous" : "End tour"}
                    </button>
                    <button
                      className="flex items-center gap-2 font-mono underline underline-offset-4"
                      onClick={() => {
                        if (stepIndex + 1 < tourSteps.length) {
                          setStepIndex(stepIndex + 1);
                        } else {
                          setTour(false);
                        }
                      }}
                    >
                      {stepIndex + 1 < tourSteps.length ? "Next" : "End tour"}
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
                  tourSteps.length > 0 && (
                    <button
                      className="font-mono underline underline-offset-4"
                      onClick={() => {
                        setStepIndex(0);
                        setTour(true);
                      }}
                    >
                      Start tour
                    </button>
                  )
                )}
              </div>
            </footer>
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
  objectLinks,
}: {
  canvasId: string;
  cover?: boolean;
  index: number;
  objectLinks: Array<{ service: string; slug: string; canvasId: string; targetCanvasId: string }>;
}) {
  const inner = (
    <CanvasContext canvas={canvasId} key={canvasId}>
      <CanvasPreviewBlockInner cover={cover} objectLinks={objectLinks} />
    </CanvasContext>
  );

  if (index < 4) {
    return <div className="relative h-full w-full bg-[#373737]">{inner}</div>;
  }

  return (
    <div className="relative h-full w-full bg-[#373737]">
      <LazyLoadComponent placeholder={<div />} visibleByDefault={index < 4} threshold={700}>
        {inner}
      </LazyLoadComponent>
    </div>
  );
}
