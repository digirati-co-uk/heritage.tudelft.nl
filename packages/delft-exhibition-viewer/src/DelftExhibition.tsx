import { Dialog } from "@headlessui/react";
import { createPaintingAnnotationsHelper } from "@iiif/helpers/painting-annotations";
import type { Manifest } from "@iiif/presentation-3";
import {
  type ReactNode,
  Suspense,
  lazy,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  LanguageProvider,
  ManifestContext,
  VaultProvider,
  useExistingVault,
} from "react-iiif-vault";
import { getRenderingStrategy } from "react-iiif-vault/utils";
import { ImageBlock } from "./components/ImageBlock";
import { InfoBlock } from "./components/InfoBlock";
import { MediaBlock } from "./components/MediaBlock";
import { TitlePanel } from "./components/TitleBlock";
import "./styles/lib.css";
import { twMerge } from "tailwind-merge";
import { useMediaQuery } from "usehooks-ts";
import { CloseIcon } from "./components/CloseIcon";
import { TableOfContentsBar } from "./components/TableOfContentsBar";
import { TableOfContentsHeader } from "./components/TableOfContentsHeader";
import { PlayIcon } from "./components/icons/PlayIcon";
import { TopIcon } from "./components/icons/TopIcon";

export type DelftExhibitionProps = {
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
    fullTitleBar?: boolean;
    cutCorners?: boolean;
    alternativeImageMode?: boolean;
  };
  content?: {
    exhibition: string;
    tableOfContents: string;
  };
};

const Presentation = lazy(() => import("./DelftPresentation"));

export function DelftExhibition(props: DelftExhibitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const vault = useExistingVault();
  const matches = useMediaQuery("(min-width: 1200px)");
  const helper = createPaintingAnnotationsHelper();
  const {
    cutCorners = true,
    fullTitleBar = false,
    alternativeImageMode = true,
  } = props.options || {};

  if (props.manifest?.id && !vault.requestStatus(props.manifest.id)) {
    vault.loadSync(
      props.manifest.id,
      JSON.parse(JSON.stringify(props.manifest)),
    );
  }

  return (
    <VaultProvider vault={vault} key={matches ? "large" : "small"}>
      <ManifestContext manifest={props.manifest.id}>
        <LanguageProvider language={props.language || "en"}>
          <Dialog
            className="relative z-50"
            open={enabled}
            onClose={() => setEnabled(false)}
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="mobile-height fixed inset-0 flex w-screen items-center lg:p-4">
              <button
                className="absolute top-3 right-3 lg:right-8 lg:top-8 z-30 flex h-8 w-8 items-center justify-center rounded bg-black text-white hover:bg-slate-700"
                onClick={() => setEnabled(false)}
              >
                <CloseIcon fill="currentColor" />
              </button>
              <Dialog.Panel className="relative flex h-full w-full justify-center overflow-y-auto overflow-x-hidden rounded bg-white">
                {enabled ? (
                  <Suspense>
                    <Presentation {...props} options={{ autoPlay: true }} />
                  </Suspense>
                ) : null}
              </Dialog.Panel>
            </div>
          </Dialog>

          <TableOfContentsHeader
            label={props.manifest.label}
            content={{ exhibition: props.content?.exhibition || "Exhibition" }}
          />

          <TableOfContentsBar
            fixed
            content={{
              tableOfContents:
                props.content?.tableOfContents || "Table of Contents",
            }}
            onPlay={() => setEnabled(true)}
          >
            <a
              href="#top"
              aria-label={"Back to top"}
              className="z-50 hover:bg-black/10 w-10 h-10 rounded flex items-center justify-center"
            >
              <TopIcon />
            </a>

            <button
              className="z-50 hover:bg-black/10 w-10 h-10 rounded flex items-center justify-center"
              onClick={() => setEnabled(true)}
              aria-label="Play"
            >
              <span className="sr-only">Play</span>
              <PlayIcon />
            </button>
          </TableOfContentsBar>

          <div ref={containerRef} data-cut-corners-enabled={cutCorners}>
            <div
              className={twMerge(
                "delft-exhibition-viewer slides mb-12 auto-rows-auto grid-cols-12 content-center justify-center lg:grid",
                enabled ? "opacity-0" : "",
              )}
            >
              {!fullTitleBar ? <TitlePanel manifest={props.manifest} /> : null}
              {(props.manifest.items || []).map((canvas: any, idx) => {
                if (!canvas) return null;
                try {
                  const paintables = helper.getPaintables(canvas);
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
                      <InfoBlock
                        key={idx}
                        scrollEnabled={!enabled}
                        index={idx}
                        firstInfo={fullTitleBar && idx === 1}
                        canvas={canvas}
                        strategy={strategy}
                        locale={props.language || "en"}
                      />
                    );
                  }

                  if (strategy.type === "images") {
                    return (
                      <ImageBlock
                        key={idx}
                        scrollEnabled={!enabled}
                        canvas={canvas}
                        index={idx}
                        objectLinks={foundLinks}
                        alternativeMode={alternativeImageMode}
                      />
                    );
                  }

                  if (strategy.type === "media") {
                    return (
                      <Suspense
                        key={idx}
                        fallback={
                          <div className={"cut-corners bg-black text-white"} />
                        }
                      >
                        <MediaBlock
                          key={idx}
                          scrollEnabled={!enabled}
                          canvas={canvas}
                          strategy={strategy}
                          index={idx}
                        />
                      </Suspense>
                    );
                  }

                  return null;
                } catch (e) {
                  return null;
                }
              })}
            </div>
          </div>
        </LanguageProvider>
      </ManifestContext>
    </VaultProvider>
  );
}
