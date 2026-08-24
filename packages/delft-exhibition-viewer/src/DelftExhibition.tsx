import { ImageBlock } from "@/components/exhibition/ImageBlock";
import { InfoBlock } from "@/components/exhibition/InfoBlock";
import { MediaBlock } from "@/components/exhibition/MediaBlock";
import { Dialog } from "@headlessui/react";
import type { Manifest } from "@iiif/presentation-3";
import { type ReactNode, Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useManifest, useVault, useVaultSelector } from "react-iiif-vault";
import { TitlePanel } from "./components/exhibition/TitleBlock";
import "./styles/lib.css";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { createRangeHelper, type Vault } from "@iiif/helpers";
import { usePress } from "react-aria";
import { twMerge } from "tailwind-merge";
import { useMediaQuery } from "usehooks-ts";
import { RangeTitleBlock } from "./components/exhibition/RangeTitleBlock";
import { Provider } from "./components/Provider";
import { PlayIcon } from "./components/icons/PlayIcon";
import { TopIcon } from "./components/icons/TopIcon";
import { TableOfContentsBar } from "./components/shared/TableOfContentsBar";
import { TableOfContentsHeader } from "./components/shared/TableOfContentsHeader";
import { MapCanvasStrategy } from "./helpers/MapCanvasStrategy";
import { createTableOfContentsItems, groupRangeItemsByCanvasIndex } from "./helpers/range-navigation";

export type DelftExhibitionProps = {
  manifest: Manifest | string;
  skipLoadManifest?: boolean;
  canvasId?: string;
  vaultManifestId?: string;
  language?: string | undefined;
  viewObjectLinks?: Array<{
    service: string;
    slug: string;
    canvasId: string;
    targetCanvasId: string;
    component: ReactNode;
  }>;
  options?: {
    hideTitle?: boolean;
    fullTitleBar?: boolean;
    fullWidthGrid?: boolean;
    hideTableOfContents?: boolean;
    disablePresentation?: boolean;
    hideTitleCard?: boolean;
    cutCorners?: boolean;
    alternativeImageMode?: boolean;
    transitionScale?: boolean;
    imageInfoIcon?: boolean;
    coverImages?: boolean;
    hideRangeTitles?: boolean;
  };
  content?: {
    exhibition: string;
    tableOfContents: string;
    readMore?: string;
  };

  customVault?: Vault;
};

const Presentation = lazy(() => import("./DelftPresentation"));

export function DelftExhibition(props: DelftExhibitionProps) {
  const matches = useMediaQuery("(min-width: 1200px)");

  return (
    <Provider
      key={matches ? "large" : "small"}
      language={props.language}
      manifest={props.manifest}
      customVault={props.customVault}
      skipLoadManifest={props.skipLoadManifest}
    >
      <DelftExhibitionInner {...props} />
    </Provider>
  );
}

export function DelftExhibitionInner(props: DelftExhibitionProps) {
  const manifest = useManifest();
  const vault = useVault();
  const containerRef = useRef<HTMLDivElement>(null);
  const initialHashScrollKey = useRef<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  const {
    cutCorners = true,
    fullTitleBar = false,
    hideTitleCard = !!props.canvasId,
    disablePresentation = !!props.canvasId,
    alternativeImageMode = true,
    hideTitle = false,
    transitionScale = false,
    imageInfoIcon = false,
    coverImages = false,
    fullWidthGrid = false,
    hideTableOfContents = !!props.canvasId,
    hideRangeTitles = !!props.canvasId,
  } = props.options || {};
  const rangeHelper = useMemo(() => createRangeHelper(vault), [vault]);
  const range = useVaultSelector((s, vault) => vault.get((manifest?.structures || [])[0]));
  const canvases = useVaultSelector((s, vault) => vault.get(manifest?.items || []));
  const tree = useMemo(() => rangeHelper.rangeToTableOfContentsTree(range), [range, rangeHelper]);
  const tableOfContentsItems = useMemo(() => createTableOfContentsItems(tree, canvases), [tree, canvases]);
  const rangeTitlesByCanvasIndex = useMemo(
    () => groupRangeItemsByCanvasIndex(tableOfContentsItems),
    [tableOfContentsItems],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return;
    const hash = window.location.hash.slice(1);
    const targetId = (() => {
      try {
        return decodeURIComponent(hash);
      } catch {
        return hash;
      }
    })();
    const scrollKey = `${manifest?.id || ""}:${targetId}`;
    if (initialHashScrollKey.current === scrollKey) return;

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ block: "start" });
        initialHashScrollKey.current = scrollKey;
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [manifest?.id, tableOfContentsItems.length]);

  const renderRangeTitles = (index: number) => {
    if (hideRangeTitles) return null;
    const rangeTitles = rangeTitlesByCanvasIndex.get(index);
    return rangeTitles?.length ? <RangeTitleBlock items={rangeTitles} scrollEnabled={!enabled} /> : null;
  };

  const { pressProps: closeButtonProps } = usePress({
    onPress: () => setEnabled(false),
  });
  const { pressProps: playButtonProps } = usePress({
    onPress: () => setEnabled(true),
  });

  if (!manifest) return null;

  return (
    <div className="exhibition-viewer delft-exhibition-viewer">
      {disablePresentation ? null : (
        <Dialog className="exhibition-viewer exhibition-viewer-dialog" open={enabled} onClose={() => setEnabled(false)}>
          <div className="fixed modal-top left-0 right-0 bg-black/30" aria-hidden="true" />
          <div className="mobile-height fixed modal-top left-0 bottom-0 right-0 flex w-screen items-center lg:p-4">
            <button
              className="absolute top-3 right-3 lg:right-8 lg:top-8 z-30 flex h-8 w-8 items-center justify-center rounded bg-CloseBackground text-CloseText hover:bg-CloseBackgroundHover"
              {...closeButtonProps}
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
      )}

      {hideTitle || hideTitleCard ? (
        <div id="top" />
      ) : (
        <TableOfContentsHeader
          label={manifest.label}
          content={{
            exhibition: props.content?.exhibition || "Exhibition",
          }}
        />
      )}

      {hideTableOfContents ? null : (
        <TableOfContentsBar
          fixed
          content={{
            tableOfContents: props.content?.tableOfContents || "Table of Contents",
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
            aria-label="Play"
            {...playButtonProps}
          >
            <span className="sr-only">Play</span>
            <PlayIcon />
          </button>
        </TableOfContentsBar>
      )}

      <div ref={containerRef} data-cut-corners-enabled={cutCorners}>
        <div
          className={twMerge(
            "delft-exhibition-viewer slides w-full auto-rows-auto grid-cols-12 content-center justify-center lg:grid",
            enabled ? "opacity-0" : "",
          )}
        >
          {!fullTitleBar && !hideTitleCard ? <TitlePanel manifest={manifest} /> : null}

          <MapCanvasStrategy onlyCanvasId={props.canvasId} items={manifest.items || []}>
            {{
              // When its images.
              images: ({ index, canvas }) => {
                const foundLinks = (props.viewObjectLinks || []).filter((link) => link.canvasId === canvas.id);

                return (
                  <>
                    {renderRangeTitles(index)}
                    <ImageBlock
                      key={index}
                      scrollEnabled={!enabled}
                      canvas={canvas}
                      index={index}
                      fullWidthGrid={fullWidthGrid}
                      coverImages={coverImages}
                      objectLinks={foundLinks}
                      alternativeMode={alternativeImageMode}
                      transitionScale={transitionScale}
                      imageInfoIcon={imageInfoIcon}
                    />
                  </>
                );
              },

              // Textual content
              "textual-content": ({ index, canvas, strategy }) => (
                <>
                  {renderRangeTitles(index)}
                    <InfoBlock
                      scrollEnabled={!enabled}
                      index={index}
                      firstInfo={fullTitleBar && index === 1}
                      canvas={canvas}
                      strategy={strategy}
                      content={{
                        readMore: props.content?.readMore || "Read more",
                      }}
                    />
                </>
              ),

              // Media content
              media: ({ index, canvas, strategy }) => (
                <>
                  {renderRangeTitles(index)}
                  <Suspense key={index} fallback={<div className={"cut-corners bg-black text-white"} />}>
                    <MediaBlock
                      key={index}
                      scrollEnabled={!enabled}
                      canvas={canvas}
                      strategy={strategy}
                      index={index}
                      fullWidthGrid={fullWidthGrid}
                    />
                  </Suspense>
                </>
              ),
            }}
          </MapCanvasStrategy>
        </div>
      </div>
    </div>
  );
}
