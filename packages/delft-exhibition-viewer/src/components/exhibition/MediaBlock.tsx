import { CloseIcon } from "@/components/icons/CloseIcon";
import { Dialog } from "@headlessui/react";
import { getValue } from "@iiif/helpers";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { Suspense, lazy, useState } from "react";
import { usePress } from "react-aria";
import { type MediaStrategy, type SingleYouTubeVideo, useThumbnail } from "react-iiif-vault";
import { LocaleString } from "react-iiif-vault";
import { BaseExhibitionBlock } from "./BaseExhibitionBlock";

export interface MediaBlockProps {
  canvas: CanvasNormalized;
  strategy: MediaStrategy;
  index: number;
  id?: string;
  scrollEnabled?: boolean;
  fullWidthGrid?: boolean;
}

function getWindowHost() {
  return typeof window !== "undefined" ? window.location.host : "";
}

const IIIFMediaPlayer = lazy(() => import("../shared/IIIFMediaPlayer"));

export function MediaBlock(props: MediaBlockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const thumbnail = useThumbnail({ width: 1024, height: 1024 });
  const media = props.strategy.media as SingleYouTubeVideo;
  const { pressProps } = usePress({
    onPress: () => setIsOpen(true),
  });
  const { pressProps: closePressProps } = usePress({
    onPress: () => setIsOpen(false),
  });
  const annotation = media.annotation;

  const label = props.canvas?.label || annotation.label;
  const summary = props.canvas?.summary || annotation.summary;

  return (
    <BaseExhibitionBlock
      id={props.id}
      index={props.index}
      scrollEnabled={props.scrollEnabled}
      fullWidthGrid={props.fullWidthGrid}
    >
      <img
        {...pressProps}
        className="h-full w-full object-cover"
        src={thumbnail?.id}
        alt={getValue(label) || "An image of the canvas"}
      />
      <Dialog className="relative z-50" open={isOpen} onClose={() => setIsOpen(false)}>
        <div className="fixed inset-0 bg-BackgroundOverlay" aria-hidden="true" />
        <div className="mobile-height fixed inset-0 flex w-screen items-center p-4">
          <button
            className="absolute right-6 top-6 z-20 flex h-16 w-16 items-center justify-center rounded bg-ControlBar hover:bg-ControlHover"
            {...closePressProps}
          >
            <CloseIcon fill="#fff" />
          </button>
          <Dialog.Panel className="relative flex h-full w-full flex-col justify-center overflow-y-auto overflow-x-hidden rounded bg-InfoBlock text-InfoBlockText">
            <div className="relative w-full h-full flex-1">
              {media.type === "VideoYouTube" ? (
                <iframe
                  title="YouTube video player"
                  className="h-full w-full border-none object-cover"
                  src={`https://www.youtube.com/embed/${(media as SingleYouTubeVideo).youTubeId}?enablejsapi=1&origin=${getWindowHost()}&modestbranding=1&rel=0`}
                  // @ts-ignore
                  referrerPolicy="no-referrer compute-pressure"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                />
              ) : (
                <Suspense>
                  <IIIFMediaPlayer
                    className="absolute bottom-0 left-0 right-0 top-0 z-10"
                    poster={thumbnail?.id}
                    // autoPlay
                    media={{
                      duration: media.duration,
                      format: "video/mp4",
                      url: media.url,
                    }}
                  />
                </Suspense>
              )}
            </div>
            {label || summary ? (
              <div className="p-8 text-InfoBlockText">
                {label ? (
                  <h3 className="mb-2 uppercase">
                    <LocaleString>{label}</LocaleString>
                  </h3>
                ) : null}
                <p>{summary ? <LocaleString>{summary}</LocaleString> : null}</p>
              </div>
            ) : null}
          </Dialog.Panel>
        </div>
      </Dialog>
    </BaseExhibitionBlock>
  );
}
