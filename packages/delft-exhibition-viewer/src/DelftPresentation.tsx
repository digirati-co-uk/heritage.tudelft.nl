import { createPaintingAnnotationsHelper } from "@iiif/helpers/painting-annotations";
import type { Manifest } from "@iiif/presentation-3";
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import {
  LanguageProvider,
  ManifestContext,
  VaultProvider,
  useExistingVault,
} from "react-iiif-vault";
import { getRenderingStrategy } from "react-iiif-vault/utils";
import { useStore } from "zustand";
import "./styles/lib.css";
import { ImageBlockPresentation } from "./components/ImageBlockPresentation";
import { InfoBlockPresentation } from "./components/InfoBlockPresentation";
import { MediaBlockPresentation } from "./components/MediaBlockPresentation";
import { TitleBlockPresentation } from "./components/TitleBlockPresentation";
import "./styles/presentation.css";
import { TableOfContentsBar } from "./components/TableOfContentsBar";
import { NextIcon } from "./components/icons/NextIcon";
import { PauseIcon } from "./components/icons/PauseIcon";
import { PlayIcon } from "./components/icons/PlayIcon";
import { PreviousIcon } from "./components/icons/PreviousIcon";
import {
  ExhibitionProvider,
  createExhibitionStore,
} from "./helpers/exhibition-store";
import { useHashValue } from "./helpers/use-hash-value";

export type DelftPresentationProps = {
  manifest: Manifest;
  language: string | undefined;
  viewObjectLinks: Array<{
    service: string;
    slug: string;
    canvasId: string;
    targetCanvasId: string;
    component: ReactNode;
  }>;
  options?: { cutCorners?: boolean; autoPlay?: boolean };
};

export function DelftPresentation(props: DelftPresentationProps) {
  const deckRef = useRef<Reveal.Api | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const vault = useExistingVault();
  const { cutCorners, autoPlay } = props.options || {};
  const [hash, setHash] = useHashValue((idx) => {
    const idxAsNumber = idx ? Number.parseInt(idx, 10) : null;
    if (idxAsNumber) {
      store.getState().goToCanvasIndex(idxAsNumber);
    }
  });

  const startCanvasIndex = hash ? Number.parseInt(hash, 10) : 0;

  // Needs to be here.
  if (props.manifest?.id && !vault.requestStatus(props.manifest.id)) {
    vault.loadSync(
      props.manifest.id,
      JSON.parse(JSON.stringify(props.manifest)),
    );
  }

  const helper = createPaintingAnnotationsHelper();
  const store = useMemo(
    () =>
      createExhibitionStore({
        vault: vault as any,
        manifest: props.manifest,
        objectLinks: props.viewObjectLinks,
        startCanvasIndex,
      }),
    [vault, props.manifest],
  );

  const {
    currentStep,
    goToStep,
    nextStep,
    previousStep,
    steps,
    play,
    playPause,
    isPlaying,
  } = useStore(store);

  const step = currentStep === -1 ? null : steps[currentStep];

  useEffect(() => {
    if (autoPlay) {
      play();
    }
  }, []);

  useEffect(() => {
    if (step?.canvasIndex) {
      setHash(`${step?.canvasIndex}`);
    }
  }, [step?.canvasIndex]);

  // useLayoutEffect(() => {
  //   if (deckRef.current) return;

  //   deckRef.current = new Reveal(containerRef.current!, {
  //     // transition: "slide",
  //     // other config options
  //   });

  //   deckRef.current.initialize().then(() => {
  //     // good place for event handlers and plugin setups
  //   });

  //   return () => {
  //     try {
  //       if (deckRef.current) {
  //         deckRef.current.destroy();
  //         deckRef.current = null;
  //       }
  //     } catch (e) {
  //       console.warn("Reveal.js destroy call failed.");
  //     }
  //   };
  // }, []);

  return (
    <ExhibitionProvider store={store}>
      <VaultProvider vault={vault}>
        <ManifestContext manifest={props.manifest.id}>
          <LanguageProvider language={props.language || "en"}>
            <div className="flex flex-col h-full w-full">
              <div
                data-cut-corners-enabled={cutCorners}
                className={
                  "delft-presentation-viewer relative w-full bg-black flex-1 min-h-0"
                }
              >
                {props.manifest.items.map((canvas: any, idx) => {
                  const paintables = helper.getPaintables(canvas);
                  try {
                    const strategy = getRenderingStrategy({
                      canvas,
                      loadImageService: (t) => t,
                      paintables,
                      supports: [
                        "empty",
                        "images",
                        "media",
                        "video",
                        "3d-model",
                        "textual-content",
                        "complex-timeline",
                      ],
                    });

                    const foundLinks = props.viewObjectLinks.filter(
                      (link) => link.canvasId === canvas.id,
                    );

                    if (strategy.type === "textual-content") {
                      return (
                        <InfoBlockPresentation
                          key={idx}
                          index={idx}
                          active={step?.canvasId === canvas.id}
                          canvas={canvas}
                          strategy={strategy}
                          locale={props.language || "en"}
                        />
                      );
                    }

                    if (strategy.type === "images") {
                      return (
                        <ImageBlockPresentation
                          key={idx}
                          active={step?.canvasId === canvas.id}
                          canvas={canvas}
                          index={idx}
                          objectLinks={foundLinks}
                        />
                      );
                    }

                    if (strategy.type === "media") {
                      return (
                        <MediaBlockPresentation
                          key={idx}
                          active={step?.canvasId === canvas.id}
                          canvas={canvas}
                          strategy={strategy}
                          index={idx}
                        />
                      );
                    }

                    return null;
                  } catch (e) {
                    return null;
                  }
                })}
              </div>
              <div>
                <TableOfContentsBar
                  content={{
                    tableOfContents:
                      props.manifest?.label || "Table of contents",
                  }}
                >
                  <button
                    type="button"
                    className="z-50 hover:bg-black/10 w-10 h-10 rounded flex items-center justify-center"
                    onClick={playPause}
                  >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  </button>

                  <div className="w-16 flex items-center relative">
                    <div className="h-1 w-full bg-white/20 rounded-full" />
                    <div
                      className="h-1 bg-white absolute top-0 left-0 transition-all rounded-full"
                      style={{
                        width: `${(currentStep / steps.length) * 100}%`,
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    className="z-50 hover:bg-black/10 w-10 h-10 rounded flex items-center justify-center"
                    onClick={previousStep}
                  >
                    <PreviousIcon />
                  </button>

                  <button
                    type="button"
                    className="z-50 hover:bg-black/10 w-10 h-10 rounded flex items-center justify-center"
                    onClick={nextStep}
                  >
                    <NextIcon />
                  </button>
                </TableOfContentsBar>
              </div>
            </div>
          </LanguageProvider>
        </ManifestContext>
      </VaultProvider>
    </ExhibitionProvider>
  );
}

export default DelftPresentation;
