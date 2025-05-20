import { Dialog } from "@headlessui/react";
import type { Canvas } from "@iiif/presentation-3";
import { Suspense, lazy, useState } from "react";
import {
  type MediaStrategy,
  type SingleYouTubeVideo,
  useThumbnail,
} from "react-iiif-vault";
import { CanvasContext } from "react-iiif-vault";
import { LocaleString } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { getClassName } from "../helpers/exhibition";
import { BaseGridSection } from "./BaseGridSection";
import { CloseIcon } from "./CloseIcon";

export interface MediaBlockProps {
  canvas: Canvas;
  strategy: MediaStrategy;
  index: number;
  id?: string;
  scrollEnabled?: boolean;
}

function getWindowHost() {
  return typeof window !== "undefined" ? window.location.host : "";
}

const IIIFMediaPlayer = lazy(() => import("./IIIFMediaPlayer"));

function MediaBlockInner(props: MediaBlockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const className = getClassName(props.canvas.behavior);
  const thumbnail = useThumbnail({ width: 1024, height: 1024 });
  const media = props.strategy.media as SingleYouTubeVideo;
  // if (props.strategy.media.type !== "VideoYouTube") return null;
  const annotation = media.annotation;

  return (
    <BaseGridSection
      id={props.id || `${props.index}`}
      enabled={props.scrollEnabled}
      className={twMerge(
        "cut-corners bg-InfoBlock text-InfoBlockText",
        className,
      )}
    >
      <img
        className="h-full w-full object-cover"
        src={thumbnail?.id}
        alt=""
        onClick={() => setIsOpen(true)}
      />

      <Dialog
        className="relative z-50"
        open={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <div
          className="fixed inset-0 bg-BackgroundOverlay"
          aria-hidden="true"
        />
        <div className="mobile-height fixed inset-0 flex w-screen items-center p-4">
          <button
            className="absolute right-6 top-6 z-20 flex h-16 w-16 items-center justify-center rounded bg-ControlBar hover:bg-ControlHover"
            onClick={() => setIsOpen(false)}
          >
            <CloseIcon fill="#fff" />
          </button>
          <Dialog.Panel className="relative flex h-full w-full flex-col justify-center overflow-y-auto overflow-x-hidden rounded bg-InfoBlock text-InfoBlockText">
            <div className="relative w-full flex-1">
              {media.type === "VideoYouTube" ? (
                <iframe
                  title="YouTube video player"
                  className="h-full w-full border-none object-cover"
                  src={`https://www.youtube.com/embed/${(media as SingleYouTubeVideo).youTubeId}?enablejsapi=1&origin=${getWindowHost()}&autoplay=1&modestbranding=1&rel=0`}
                  referrerPolicy="no-referrer"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                />
              ) : (
                <Suspense>
                  <IIIFMediaPlayer
                    className="absolute bottom-0 left-0 right-0 top-0 z-10"
                    media={{
                      duration: media.duration,
                      format: "video/mp4",
                      url: media.url,
                    }}
                  />
                </Suspense>
              )}
            </div>
            {annotation?.label || annotation?.summary ? (
              <div className="p-8 text-InfoBlockText">
                {annotation?.label ? (
                  <h3 className="mb-2 uppercase">
                    <LocaleString>{annotation.label}</LocaleString>
                  </h3>
                ) : null}
                <p>
                  {annotation?.summary ? (
                    <LocaleString>{annotation.summary}</LocaleString>
                  ) : null}
                </p>
              </div>
            ) : null}
          </Dialog.Panel>
        </div>
      </Dialog>
    </BaseGridSection>
  );
}

export function MediaBlock(props: MediaBlockProps) {
  return (
    <CanvasContext canvas={props.canvas.id} key={props.canvas.id}>
      <MediaBlockInner {...props} />
    </CanvasContext>
  );
}
