import { Suspense } from "react";
import {
  LocaleString,
  type SingleYouTubeVideo,
  useThumbnail,
} from "react-iiif-vault";
import { BaseSlide, type BaseSlideProps } from "@/components/shared/BaseSlide";
import IIIFMediaPlayer from "../shared/IIIFMediaPlayer";
import type { MediaBlockProps } from "@/components/exhibition/MediaBlock";

function getWindowHost() {
  return typeof window !== "undefined" ? window.location.host : "";
}

export function MediaBlockPresentation(
  props: BaseSlideProps & MediaBlockProps,
) {
  const media = props.strategy.media as SingleYouTubeVideo;
  const annotation = media.annotation;
  const thumbnail = useThumbnail({ width: 1024, height: 1024 });

  const label = annotation.label || props.canvas.label;
  const summary = annotation.summary || props.canvas.summary;

  return (
    <BaseSlide
      className={"flex flex-col items-center bg-black px-8 pb-8"}
      index={props.index}
      active={props.active}
    >
      <div className="h-full w-full flex-1 relative">
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
        <div className="p-8 text-white w-full">
          {label ? (
            <h3 className="mb-2 uppercase">
              <LocaleString>{label}</LocaleString>
            </h3>
          ) : null}
          <p>{summary ? <LocaleString>{summary}</LocaleString> : null}</p>
        </div>
      ) : null}
    </BaseSlide>
  );
}
