import type { Manifest } from "@iiif/presentation-3";
import type { ReactNode } from "react";
import { LanguageProvider, ManifestContext, VaultProvider, useManifest } from "react-iiif-vault";
import "./styles/lib.css";
import { NextIcon } from "@/components/icons/NextIcon";
import { PauseIcon } from "@/components/icons/PauseIcon";
import { PlayIcon } from "@/components/icons/PlayIcon";
import { PreviousIcon } from "@/components/icons/PreviousIcon";
import { ImageBlockPresentation } from "@/components/presentation/ImageBlockPresentation";
import { InfoBlockPresentation } from "@/components/presentation/InfoBlockPresentation";
import { MediaBlockPresentation } from "@/components/presentation/MediaBlockPresentation";
import { TableOfContentsBar } from "@/components/shared/TableOfContentsBar";
import { ExhibitionProvider, useExhibition } from "@/helpers/exhibition-store";
import { useExhibitionStore } from "@/hooks/use-exhibition-store";
import type { Vault } from "@iiif/helpers";
import { Provider } from "./components/Provider";
import { MapCanvasStrategy } from "./helpers/MapCanvasStrategy";

export type DelftPresentationProps = {
  manifest: Manifest | string;
  language?: string | undefined;
  canvasId?: string;
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
  customVault?: Vault;
};

export function DelftPresentation(props: DelftPresentationProps) {
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
      <Provider manifest={props.manifest} customVault={props.customVault}>
        <PresentationInner {...props} />
      </Provider>
    </ExhibitionProvider>
  );
}

export default DelftPresentation;

export function PresentationInner(props: DelftPresentationProps) {
  const manifest = useManifest();
  const { cutCorners, floatingPosition, isFloating } = props.options || {};
  const state = useExhibition();
  const step = state.currentStep === -1 ? null : state.steps[state.currentStep];
  const isSingleStep = state.steps.length === 1;

  if (!manifest) return;

  return (
    <div className="flex h-full w-full flex-col">
      <div
        data-cut-corners-enabled={cutCorners}
        className={"delft-presentation-viewer relative min-h-0 w-full flex-1 bg-black"}
      >
        <MapCanvasStrategy onlyCanvasId={props.canvasId} items={manifest.items || []}>
          {{
            "textual-content": ({ canvas, index, strategy }) => {
              const isActive = step?.canvasId === canvas.id;
              return (
                <InfoBlockPresentation
                  //
                  key={index}
                  index={index}
                  active={isActive}
                  canvas={canvas}
                  strategy={strategy}
                />
              );
            },
            images: ({ canvas, index, strategy }) => {
              const isActive = step?.canvasId === canvas.id;
              const foundLinks = (props.viewObjectLinks || []).filter((link) => link.canvasId === canvas.id);

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
            },

            media: ({ canvas, index, strategy }) => {
              const isActive = step?.canvasId === canvas.id;
              return (
                <MediaBlockPresentation
                  key={index}
                  active={isActive}
                  canvas={canvas}
                  strategy={strategy}
                  index={index}
                />
              );
            },
          }}
        </MapCanvasStrategy>
      </div>
      <div>
        <TableOfContentsBar
          content={{
            tableOfContents: manifest?.label || "Table of contents",
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
  );
}
