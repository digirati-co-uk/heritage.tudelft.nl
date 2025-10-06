import { Dialog } from "@headlessui/react";
import type { Canvas } from "@iiif/presentation-3";
import { Suspense, lazy, useState } from "react";
import { usePress } from "react-aria";
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
  const canvas = props.canvas;
  const behavior = props.canvas.behavior || [];
  const isLeft = behavior.includes("left");
  const isRight = behavior.includes("right");
  const isBottom = behavior.includes("bottom");
  const isTop = behavior.includes("top");
  const className = getClassName(props.canvas.behavior);
  const thumbnail = useThumbnail({ width: 1024, height: 1024 });
  const media = props.strategy.media as SingleYouTubeVideo;
  const { pressProps } = usePress({
    onPress: () => setIsOpen(true),
  });
  // if (props.strategy.media.type !== "VideoYouTube") return null;
  const annotation = media.annotation;

  const label = props.canvas?.label || annotation.label;
  const summary = props.canvas?.summary || annotation.summary;

  const showSummary = Boolean(
    summary && (isLeft || isRight || isBottom || isTop),
  );

  return (
    <BaseGridSection
      id={props.id || `${props.index}`}
      enabled={props.scrollEnabled}
      className={twMerge(
        className,
        "cut-corners relative",
        !showSummary && "aspect-square lg:aspect-auto",
      )}
      data-info-top={isTop}
      data-info-right={isRight}
      data-info-bottom={isBottom}
      data-info-left={isLeft}
    >
      {showSummary ? (
        <div
          className={twMerge(
            "h-full md:flex",
            isLeft && "flex-row-reverse",
            isBottom && "flex-col",
            isTop && "flex-col-reverse",
          )}
        >
          <div
            className={twMerge(
              "cut-corners flex-1 md:w-2/3",
              (isBottom || isTop) && "w-full md:w-full",
              "aspect-square md:aspect-auto",
            )}
          >
            <img
              className="h-full w-full object-cover"
              src={thumbnail?.id}
              alt=""
              {...pressProps}
            />
          </div>
          <div
            className={twMerge(
              "cut-corners flex flex-col bg-InfoBlock text-InfoBlockText p-5 md:w-1/3",
              (isBottom || isTop) && "w-full md:w-full",
            )}
          >
            <div
              className={twMerge(
                (isBottom || isRight) && "mb-4",
                isLeft && "place-self-end md:rotate-180",
                isTop && "order-3 place-self-start md:rotate-180 mt-4",
              )}
            >
              <svg
                className={twMerge(
                  isBottom || isTop ? "rotate-90" : "rotate-90 md:rotate-0",
                )}
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                <title>arrow</title>
                <path
                  d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div className="text-m mb-4 font-mono delft-title">
              <LocaleString>{canvas.label}</LocaleString>
            </div>
            <div className="exhibition-info-block">
              <div>
                <LocaleString
                  enableDangerouslySetInnerHTML
                  className="whitespace-pre-wrap"
                >
                  {canvas.summary}
                </LocaleString>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <img
          className="h-full w-full object-cover"
          src={thumbnail?.id}
          alt=""
          {...pressProps}
        />
      )}

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
