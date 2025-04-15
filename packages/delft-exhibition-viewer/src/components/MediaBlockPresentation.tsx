import { LocaleString, type SingleYouTubeVideo } from "react-iiif-vault";
import { BaseSlide, type BaseSlideProps } from "./BaseSlide";
import type { MediaBlockProps } from "./MediaBlock";

function getWindowHost() {
  return typeof window !== "undefined" ? window.location.host : "";
}

export function MediaBlockPresentation(
  props: BaseSlideProps & MediaBlockProps,
) {
  const media = props.strategy.media as SingleYouTubeVideo;
  if (props.strategy.media.type !== "VideoYouTube") return null;
  const annotation = media.annotation;

  return (
    <BaseSlide
      className={"flex items-center px-8 pb-8 flex-col bg-black"}
      index={props.index}
      active={props.active}
    >
      <div className="w-full flex-1">
        <iframe
          title="YouTube video player"
          className="h-full w-full border-none object-cover"
          src={`https://www.youtube.com/embed/${(media as SingleYouTubeVideo).youTubeId}?enablejsapi=1&origin=${getWindowHost()}&autoplay=1&modestbranding=1&rel=0`}
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-presentation"
        />
      </div>
      <div className="p-8 text-white">
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
    </BaseSlide>
  );
}
