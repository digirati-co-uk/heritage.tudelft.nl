import type { Manifest } from "@iiif/presentation-3";
import type { ReactNode } from "react";
import { LanguageProvider, ManifestContext, VaultProvider } from "react-iiif-vault";
import "./styles/lib.css";
import { NextIcon } from "@/components/icons/NextIcon";
import { PauseIcon } from "@/components/icons/PauseIcon";
import { PlayIcon } from "@/components/icons/PlayIcon";
import { PreviousIcon } from "@/components/icons/PreviousIcon";
import { ImageBlockPresentation } from "@/components/presentation/ImageBlockPresentation";
import { InfoBlockPresentation } from "@/components/presentation/InfoBlockPresentation";
import { MediaBlockPresentation } from "@/components/presentation/MediaBlockPresentation";
import { TableOfContentsBar } from "@/components/shared/TableOfContentsBar";
import { ExhibitionProvider } from "@/helpers/exhibition-store";
import { useExhibitionStore } from "@/hooks/use-exhibition-store";

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
  options?: {
    cutCorners?: boolean;
    autoPlay?: boolean;
    isFloating?: boolean;
    floatingPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  };
};

export function DelftPresentation(props: DelftPresentationProps) {
  const { cutCorners, floatingPosition, isFloating } = props.options || {};
  const {
    //
    store,
    vault,
    state,
    step,
    toRenderables,
  } = useExhibitionStore(props);

  const isSingleStep = state.steps.length === 1;

  return (
    <ExhibitionProvider store={store}>
      <VaultProvider vault={vault}>
        <ManifestContext manifest={props.manifest.id}>
          <LanguageProvider language={props.language || "en"}>
            <div className="flex h-full w-full flex-col">
              <div
                data-cut-corners-enabled={cutCorners}
                className={"delft-presentation-viewer relative min-h-0 w-full flex-1 bg-black"}
              >
                {props.manifest.items
                  .map(toRenderables)
                  .filter((t) => t !== null)
                  .map(({ canvas, foundLinks, index, strategy }) => {
                    const isActive = step?.canvasId === canvas.id;

                    if (strategy.type === "textual-content") {
                      return (
                        <InfoBlockPresentation
                          key={index}
                          index={index}
                          active={isActive}
                          canvas={canvas}
                          strategy={strategy}
                        />
                      );
                    }

                    if (strategy.type === "images") {
                      return (
                        <ImageBlockPresentation
                          key={index}
                          active={isActive}
                          canvas={canvas}
                          index={index}
                          objectLinks={foundLinks}
                          isFloating={isFloating}
                          floatingPosition={floatingPosition || undefined}
                        />
                      );
                    }

                    if (strategy.type === "media") {
                      return (
                        <MediaBlockPresentation
                          key={index}
                          active={isActive}
                          canvas={canvas}
                          strategy={strategy}
                          index={index}
                        />
                      );
                    }

                    return null;
                  })}
              </div>
              <div>
                <TableOfContentsBar
                  content={{
                    tableOfContents: props.manifest?.label || "Table of contents",
                  }}
                  hideTable={isSingleStep}
                >
                  {!isSingleStep ? (
                    <>
                      <button
                        type="button"
                        className="z-50 flex h-10 w-10 items-center justify-center rounded hover:bg-black/10"
                        onClick={state.playPause}
                      >
                        {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
                      </button>

                      <div className="relative flex w-16 items-center">
                        <div className="h-1 w-full rounded-full bg-ProgressBar opacity-20" />
                        <div
                          className="absolute left-0 top-0 h-1 rounded-full bg-ProgressBar transition-all"
                          style={{
                            width: `${(state.currentStep / (state.steps.length - 1)) * 100}%`,
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        className="z-50 flex h-10 w-10 items-center justify-center rounded hover:bg-black/10"
                        onClick={() => state.previousStep()}
                      >
                        <PreviousIcon />
                      </button>

                      <button
                        type="button"
                        className="z-50 flex h-10 w-10 items-center justify-center rounded hover:bg-black/10"
                        onClick={() => (state.isPlaying ? state.nextStep(true) : state.nextStep())}
                      >
                        <NextIcon />
                      </button>
                    </>
                  ) : null}
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
