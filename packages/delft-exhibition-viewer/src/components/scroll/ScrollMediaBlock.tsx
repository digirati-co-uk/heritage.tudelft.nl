import { CloseIcon } from "@/components/icons/CloseIcon";
import { BaseGridSection } from "@/components/shared/BaseGridSection";
import { Dialog } from "@headlessui/react";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { Suspense, lazy, useState } from "react";
import { usePress } from "react-aria";
import type { MediaStrategy, SingleYouTubeVideo } from "react-iiif-vault";
import { LocaleString, useThumbnail } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";

export interface ScrollMediaBlockProps {
  canvas: CanvasNormalized;
  strategy: MediaStrategy;
  index: number;
  id?: string;
  scrollEnabled?: boolean;
}

function getWindowHost() {
  return typeof window !== "undefined" ? window.location.host : "";
}

const IIIFMediaPlayer = lazy(() => import("@/components/shared/IIIFMediaPlayer"));

export function ScrollMediaBlock(props: ScrollMediaBlockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { pressProps } = usePress({
    onPress: () => setIsOpen(true),
  });
  const { pressProps: closePressProps } = usePress({
    onPress: () => setIsOpen(false),
  });
  const media = props.strategy.media as SingleYouTubeVideo;
  const annotation = media.annotation;
  const label = props.canvas?.label || annotation.label;
  const summary = props.canvas?.summary || annotation.summary;
  const thumbnail = useThumbnail({ width: 1200, height: 720 });

  return (
    <BaseGridSection
      enabled={props.scrollEnabled}
      id={props.id || `${props.index}`}
      className="bg-black text-white py-10 sm:py-14"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 sm:px-10">
        {label ? (
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            <LocaleString>{label}</LocaleString>
          </h2>
        ) : null}
        <button
          type="button"
          className={twMerge(
            "group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5",
            "transition duration-300 hover:border-white/30 hover:bg-white/10",
          )}
          {...pressProps}
        >
          <div className="aspect-video w-full">
            {thumbnail?.id ? (
              <img
                src={thumbnail.id}
                alt={label ? "Media thumbnail" : "Media"}
                className="h-full w-full object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/70" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-3 rounded-full bg-white/90 px-5 py-2 text-sm font-semibold text-black shadow-lg">
              Play media
            </div>
          </div>
        </button>
        {summary ? (
          <p className="text-base leading-relaxed text-white/75">
            <LocaleString>{summary}</LocaleString>
          </p>
        ) : null}
      </div>

      <Dialog className="exhibition-viewer exhibition-viewer-dialog" open={isOpen} onClose={() => setIsOpen(false)}>
        <div className="fixed modal-top left-0 right-0 bottom-0 bg-BackgroundOverlay" aria-hidden="true" />
        <div className="mobile-height fixed modal-top left-0 right-0 bottom-0 flex w-screen items-center p-4">
          <button
            type="button"
            className="absolute right-6 top-6 z-20 flex h-16 w-16 items-center justify-center rounded bg-ControlBar hover:bg-ControlHover"
            {...closePressProps}
          >
            <CloseIcon fill="#fff" />
          </button>
          <Dialog.Panel className="relative flex h-full w-full flex-col justify-center overflow-y-auto overflow-x-hidden rounded bg-black text-white">
            <div className="relative w-full flex-1">
              {media.type === "VideoYouTube" ? (
                <iframe
                  title="YouTube video player"
                  className="h-full w-full border-none object-cover"
                  src={`https://www.youtube.com/embed/${media.youTubeId}?enablejsapi=1&origin=${getWindowHost()}&modestbranding=1&rel=0`}
                  referrerPolicy="no-referrer compute-pressure"
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
            {label || summary ? (
              <div className="p-8 text-white">
                {label ? (
                  <h3 className="mb-2 uppercase tracking-widest text-white/80">
                    <LocaleString>{label}</LocaleString>
                  </h3>
                ) : null}
                <p>{summary ? <LocaleString>{summary}</LocaleString> : null}</p>
              </div>
            ) : null}
          </Dialog.Panel>
        </div>
      </Dialog>
    </BaseGridSection>
  );
}
