import { createPaintingAnnotationsHelper } from "@iiif/helpers/painting-annotations";
import type { Manifest } from "@iiif/presentation-3";
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { LanguageProvider, VaultProvider, useExistingVault } from "react-iiif-vault";
import { getRenderingStrategy } from "react-iiif-vault/utils";
import { useStore } from "zustand";
import "./styles/lib.css";
import { ImageBlockPresentation } from "./components/ImageBlockPresentation";
import { InfoBlockPresentation } from "./components/InfoBlockPresentation";
import { MediaBlockPresentation } from "./components/MediaBlockPresentation";
import { TitleBlockPresentation } from "./components/TitleBlockPresentation";
import "./styles/presentation.css";
import { ExhibitionProvider, createExhibitionStore } from "./helpers/exhibition-store";

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

  // Needs to be here.
  if (props.manifest?.id && !vault.requestStatus(props.manifest.id)) {
    vault.loadSync(props.manifest.id, JSON.parse(JSON.stringify(props.manifest)));
  }

  const helper = createPaintingAnnotationsHelper();
  const store = useMemo(
    () =>
      createExhibitionStore({
        vault: vault as any,
        manifest: props.manifest,
        objectLinks: props.viewObjectLinks,
      }),
    [vault, props.manifest]
  );

  const { currentStep, goToStep, nextStep, previousStep, steps, play, playPause, isPlaying } = useStore(store);

  const step = currentStep === -1 ? null : steps[currentStep];

  useEffect(() => {
    if (autoPlay) {
      play();
    }
  }, []);

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
        <LanguageProvider language={props.language || "en"}>
          <div
            data-cut-corners-enabled={cutCorners}
            className={"delft-presentation-viewer relative h-full w-full bg-black"}
          >
            <div className="absolute bottom-0 right-0 z-30 flex gap-2 bg-[white] p-2">
              <button type="button" className="rounded border px-4 py-2 hover:bg-gray-100" onClick={playPause}>
                {isPlaying ? "Pause" : "Play"}
              </button>

              <button type="button" className="rounded border px-4 py-2 hover:bg-gray-100" onClick={previousStep}>
                Prev
              </button>
              <button type="button" className="rounded border px-4 py-2 hover:bg-gray-100" onClick={nextStep}>
                Next
              </button>
            </div>

            <TitleBlockPresentation index={0} manifest={props.manifest} active={!step} />

            {props.manifest.items.map((canvas: any, idx) => {
              const paintables = helper.getPaintables(canvas);
              try {
                const strategy = getRenderingStrategy({
                  canvas,
                  loadImageService: (t) => t,
                  paintables,
                  supports: ["empty", "images", "media", "video", "3d-model", "textual-content", "complex-timeline"],
                });

                const foundLinks = props.viewObjectLinks.filter((link) => link.canvasId === canvas.id);

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
        </LanguageProvider>
      </VaultProvider>
    </ExhibitionProvider>
  );
}

export default DelftPresentation;
