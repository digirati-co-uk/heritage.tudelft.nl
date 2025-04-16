import { type SupportedTarget, type Vault, expandTarget, getValue } from "@iiif/helpers";
import type { Annotation, Canvas, ContentResource, InternationalString, Manifest } from "@iiif/presentation-3";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { createContext, useContext } from "react";
import invariant from "tiny-invariant";
import { useStore } from "zustand";
import { type StoreApi, createStore } from "zustand/vanilla";
import type { ObjectLink } from "./object-links";

export interface ExhibitionStep {
  canvasId: string;
  canvasIndex: number;
  region: null | SupportedTarget;
  body: ContentResource[];
  highlight: null | SupportedTarget;
  annotationId: null | string;
  duration?: number;

  // Content.
  label: null | InternationalString;
  summary: null | InternationalString;
  objectLink: null | ObjectLink;

  // Links
  previousCanvasId: null | string;
  nextCanvasId: null | string;
}

interface ExhibitionStore {
  currentStep: number;
  steps: ExhibitionStep[];

  // Methods.
  nextStep(loop?: boolean): void;
  previousStep(): void;
  goToStep(step: number): void;
  goToCanvasIndex(index: number): void;

  // Time-based.
  play(): void;
  pause(): void;
  playPause(): void;
  isPlaying: boolean;
}

type ExhibitionStoreOptions = {
  vault: Vault;
  manifest?: Manifest;
  canvases?: Canvas[];
  objectLinks: Array<ObjectLink>;
  timePerSlide?: number;
  startCanvasIndex?: number;
};

const ExhibitionContext = createContext<StoreApi<ExhibitionStore> | null>(null);
ExhibitionContext.displayName = "Exhibition";

export function ExhibitionProvider({
  store,
  children,
}: {
  store: StoreApi<ExhibitionStore>;
  children: React.ReactNode;
}) {
  return <ExhibitionContext.Provider value={store}>{children}</ExhibitionContext.Provider>;
}

export function useExhibition() {
  const store = useContext(ExhibitionContext);
  invariant(store, "useExhibition must be used within a ExhibitionProvider");
  return useStore(store);
}

export function useExhibitionStep() {
  const exhibition = useExhibition();

  if (exhibition.currentStep === -1) {
    return null;
  }

  return exhibition.steps[exhibition.currentStep];
}

function getCanvasTourSteps({
  vault,
  canvas,
  canvasIndex,
  objectLinks,
  firstStep,
  previousCanvasId,
  nextCanvasId,
}: {
  vault: Vault;
  canvas: CanvasNormalized;
  canvasIndex: number;
  objectLinks: Array<ObjectLink>;
  firstStep?: boolean;
  previousCanvasId: string | null;
  nextCanvasId: string | null;
}): ExhibitionStep[] {
  const steps: ExhibitionStep[] = [];
  const annotations = canvas.annotations[0] ? vault.get(canvas.annotations[0]) : null;

  const paintingPage = canvas.items[0] ? vault.get(canvas.items[0]) : null;
  const hasMultipleAnnotations = (paintingPage?.items.length || 0) > 1;

  for (const item of annotations?.items || []) {
    const annotation = vault.get<Annotation>(item);
    const target = vault.get<Canvas | Annotation>(annotation.target as any);
    if (!target) continue;

    let region = null;

    if (target.type === "Canvas") {
      const target = expandTarget(annotation.target as any);
      if ((getValue(annotation.label) && getValue(annotation.summary)) || target.selector?.spatial) {
        steps.push({
          label: annotation.label || null,
          summary: annotation.summary || null,
          region: expandTarget(annotation.target as any),
          body: vault.get(annotation.body),
          objectLink: null,
          canvasId: canvas.id,
          annotationId: annotation.id,
          canvasIndex: canvasIndex,
          highlight: null,
          previousCanvasId,
          nextCanvasId,
        });
      }
      continue;
    }

    let imageService: null | string = null;
    if (target.body) {
      const body = vault.get(target.body);
      if (body[0]?.service?.[0]) {
        imageService = body[0].service[0].id || body[0].service[0]["@id"];
      }
    }

    if (target.type === "Canvas") {
      region = expandTarget(annotation.target as any);
    }

    if (target.type === "Annotation") {
      region = expandTarget(target.target as any);
    }

    const objectLink = imageService ? objectLinks.find((link) => link.service === imageService) || null : null;

    steps.push({
      label: target.label || null,
      summary: target.summary || null,
      region,
      body: [],
      objectLink,
      canvasId: canvas.id,
      annotationId: target.id,
      canvasIndex: canvasIndex,
      highlight: null, // @todo come back to?
      previousCanvasId,
      nextCanvasId,
    });
  }

  // @todo check if this is the right logic.
  // if (steps.length === 0 || firstStep || hasMultipleAnnotations) {
  //   steps.unshift({
  //     label: canvas.label || null,
  //     summary: canvas.summary || null,
  //     region: null,
  //     objectLink: null,
  //     canvasId: canvas.id,
  //     body: [],
  //     canvasIndex: canvasIndex,
  //     duration: canvas.duration,
  //     annotationId: null,
  //     highlight: null,
  //     previousCanvasId,
  //     nextCanvasId,
  //   });
  // }

  return steps;
}

export function createExhibitionStore(options: ExhibitionStoreOptions) {
  const { vault, manifest, canvases, objectLinks, timePerSlide = 5000, startCanvasIndex = 0 } = options;

  const selectedCanvases = canvases || manifest?.items || [];

  const allSteps: ExhibitionStep[] = [];
  for (const [index, item] of selectedCanvases.entries()) {
    const canvas = vault.get<CanvasNormalized>(item);
    const previousCanvasId = index > 0 && manifest ? manifest.items[index - 1].id : null;
    const nextCanvasId = manifest && index < manifest.items.length - 1 ? manifest.items[index + 1].id : null;
    if (!canvas) continue;
    const steps = getCanvasTourSteps({
      vault,
      canvas,
      canvasIndex: index,
      objectLinks,
      previousCanvasId,
      nextCanvasId,
      firstStep: false,
    });
    allSteps.push(...steps);
  }

  const startIndex = allSteps.findIndex((step) => step.canvasIndex === startCanvasIndex);

  return createStore<ExhibitionStore>((set, get) => {
    let nextFrameTimer: Timer | null = null;
    const play = () => {
      nextTimer();
    };
    const nextTimer = () => {
      if (nextFrameTimer) {
        clearTimeout(nextFrameTimer);
        nextFrameTimer = null;
      }
      const goToNext = () => {
        get().nextStep(true);
      };
      const stepIdx = get().currentStep;
      const resolvedNextStep = get().steps[stepIdx + 1];
      nextFrameTimer = setTimeout(goToNext, resolvedNextStep?.duration || timePerSlide);
    };
    const pause = () => {
      if (nextFrameTimer) {
        clearTimeout(nextFrameTimer);
        nextFrameTimer = null;
      }
    };

    return {
      currentStep: startIndex || 0,
      steps: allSteps,

      isPlaying: false,
      play() {
        play();
        set({ isPlaying: true });
      },
      pause() {
        pause();
        set({ isPlaying: false });
      },
      playPause() {
        const isPlaying = get().isPlaying;
        if (isPlaying) {
          pause();
        } else {
          play();
        }
        set({ isPlaying: !isPlaying });
      },
      nextStep(loop = false) {
        const currentStep = get().currentStep;
        if (currentStep < get().steps.length - 1) {
          set({ currentStep: currentStep + 1 });
        } else {
          if (loop) {
            set({ currentStep: 0 });
          }
        }
        if (get().isPlaying) {
          nextTimer();
        }
      },

      previousStep() {
        const currentStep = get().currentStep;
        if (currentStep > -1) {
          if (get().isPlaying) {
            pause();
          }
          set({ currentStep: currentStep - 1, isPlaying: false });
        }
      },

      goToStep(step: number) {
        if (step >= -1 && step < get().steps.length) {
          set({ currentStep: step });
        }
      },

      goToCanvasIndex(index: number) {
        const stepIndex = get().steps.findIndex((step) => step.canvasIndex === index);
        if (stepIndex !== -1) {
          set({ currentStep: stepIndex });
        }
      },
    };
  });
}
