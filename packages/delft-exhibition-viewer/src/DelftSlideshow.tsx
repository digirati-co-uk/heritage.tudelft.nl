import type { Manifest } from "@iiif/presentation-3";
import useEmblaCarousel from "embla-carousel-react";
import { type ReactNode, Suspense, useCallback } from "react";
import { usePress } from "react-aria";
import { LocaleString, VaultProvider, useExistingVault } from "react-iiif-vault";
import { ImageBlock } from "./components/exhibition/ImageBlock";
import { InfoBlock } from "./components/exhibition/InfoBlock";
import { MediaBlock } from "./components/exhibition/MediaBlock";
import { NextIcon } from "./components/icons/NextIcon";
import { PreviousIcon } from "./components/icons/PreviousIcon";
import { MapCanvasStrategy } from "./helpers/MapCanvasStrategy";

interface DelftSlideshowProps {
  manifest: Manifest;
  canvasId?: string;
  vaultManifestId?: string;
  language: string | undefined;
  viewObjectLinks: Array<{
    service: string;
    slug: string;
    canvasId: string;
    targetCanvasId: string;
    component: ReactNode;
  }>;
  options?: {
    alternativeImageMode?: boolean;
    transitionScale?: boolean;
    imageInfoIcon?: boolean;
    coverImages?: boolean;
  };
  content?: {
    exhibition: string;
  };
}

export function DelftSlideshow(props: DelftSlideshowProps) {
  const {
    alternativeImageMode = true,
    transitionScale = false,
    imageInfoIcon = false,
    coverImages = false,
  } = props.options || {};

  const vault = useExistingVault();
  const [emblaRef, emblaApi] = useEmblaCarousel();
  const enabled = true;

  const scrollPrev = usePress({
    onPress: () => {
      if (emblaApi) emblaApi.scrollPrev();
    },
  });

  const scrollNext = usePress({
    onPress: () => {
      if (emblaApi) emblaApi.scrollNext();
    },
  });

  if (props.manifest?.id && !vault.requestStatus(props.manifest.id)) {
    vault.loadSync(props.manifest.id, JSON.parse(JSON.stringify(props.manifest)));
  }

  return (
    <VaultProvider vault={vault}>
      <div className="exhibition-viewer flex flex-col h-full w-full min-h-0">
        <div className="overflow-hidden bg-black relative flex-1" ref={emblaRef}>
          <div className="flex h-full">
            <MapCanvasStrategy onlyCanvasId={props.canvasId} items={props.manifest.items || []}>
              {{
                // When its images.
                images: ({ index, canvas }) => {
                  const foundLinks = props.viewObjectLinks.filter((link) => link.canvasId === canvas.id);

                  return (
                    <div className="exhibition-slideshow-slide">
                      <ImageBlock
                        key={index}
                        scrollEnabled={!enabled}
                        canvas={canvas}
                        index={index}
                        fullWidthGrid
                        coverImages={coverImages}
                        objectLinks={foundLinks}
                        alternativeMode={alternativeImageMode}
                        transitionScale={transitionScale}
                        imageInfoIcon={imageInfoIcon}
                      />
                      );
                    </div>
                  );
                },

                // Textual content
                "textual-content": ({ index, canvas, strategy }) => (
                  <div className="exhibition-slideshow-slide">
                    <InfoBlock
                      // scrollEnabled={!enabled}
                      index={index}
                      // firstInfo={fullTitleBar && index === 1}
                      canvas={canvas}
                      strategy={strategy}
                    />
                  </div>
                ),

                // Media content
                media: ({ index, canvas, strategy }) => (
                  <Suspense key={index} fallback={<div className={"cut-corners bg-black text-white"} />}>
                    <MediaBlock
                      key={index}
                      scrollEnabled={!enabled}
                      canvas={canvas}
                      fullWidthGrid
                      strategy={strategy}
                      index={index}
                    />
                  </Suspense>
                ),
              }}
            </MapCanvasStrategy>
          </div>
        </div>
        <div className="bg-ControlBar items-center text-TextPrimary py-2 px-6 flex gap-4">
          <div className="flex-1 text-lg font-mono">
            <LocaleString>{props.manifest.label}</LocaleString>
          </div>
          <button
            className="z-50 flex h-10 w-10 items-center justify-center rounded hover:bg-black/10"
            {...scrollPrev.pressProps}
          >
            <PreviousIcon className="text-2xl" />
          </button>
          <button
            className="z-50 flex h-10 w-10 items-center justify-center rounded hover:bg-black/10"
            {...scrollNext.pressProps}
          >
            <NextIcon className="text-2xl" />
          </button>
        </div>
      </div>
    </VaultProvider>
  );
}
