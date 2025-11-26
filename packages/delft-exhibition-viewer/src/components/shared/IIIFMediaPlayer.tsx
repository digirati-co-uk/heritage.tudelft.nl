/**
 * Adapted from https://theseusviewer.org
 */
import { getValue } from "@iiif/helpers";
import {
  Gesture,
  MediaPlayer,
  type MediaPlayerInstance,
  MediaProvider,
  type MediaTimeUpdateEventDetail,
  Poster,
  Track,
} from "@vidstack/react";
import { DefaultVideoLayout, defaultLayoutIcons } from "@vidstack/react/player/layouts/default";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useCanvas, useThumbnail } from "react-iiif-vault";

interface IIIFMediaPlayerProps {
  className?: string;
  chapters?: any;
  media: {
    url: string;
    format: string;
    duration: number;
  };
  autoPlay?: boolean;
  poster?: string;
  startTime?: number;
  captions?: any[];
  onTimeUpdate?: (e: MediaTimeUpdateEventDetail) => void;
}

export default function IIIFMediaPlayer(props: IIIFMediaPlayerProps) {
  const mediaPlayer = useRef<MediaPlayerInstance>(null);
  const captions = props.captions || [];
  const { i18n } = useTranslation();
  const language = i18n.language;
  const chapters = props.chapters;
  const timeRef = useRef<number>(props.startTime || 0);

  return (
    <div className={props.className}>
      <MediaPlayer
        onTimeUpdate={props.onTimeUpdate}
        ref={mediaPlayer}
        lang={language}
        className="h-full w-full min-w-[275px]"
        playsInline
        autoPlay={props.autoPlay}
        posterLoad="eager"
        currentTime={props.startTime}
        duration={props.media.duration}
        src={[
          {
            src: props.media.url,
            type: props.media.format as any,
          },
        ]}
      >
        <MediaProvider className="">
          {/* VTT */}
          {captions.map((caption: any) => {
            return (
              <Track
                key={caption.id}
                src={caption.id}
                kind="subtitles"
                label={getValue(caption.label)}
                default={caption.language === language}
                language={caption.language}
              />
            );
          })}

          {/* Chapters from Ranges */}
          {chapters?.length ? (
            <Track content={chapters as any} type="json" kind="chapters" label="Chapters" default />
          ) : null}
          {/* <Track content={exampleChapters} type="json" kind="chapters" label="Chapters" default /> */}

          {/* This is the Placeholder Canvas from the IIIF Canvas */}
          {props.poster ? (
            <Poster
              className="bg-ViewerBackground absolute inset-0 block h-full w-full object-contain opacity-0 transition-opacity data-[visible]:opacity-100"
              src={props.poster}
            />
          ) : null}
          <Gestures />
          <DefaultVideoLayout
            className="z-1"
            //
            noGestures
            icons={defaultLayoutIcons}
          />
        </MediaProvider>
      </MediaPlayer>
    </div>
  );
}

function Gestures() {
  return (
    <>
      <Gesture
        className="pointer-coarse:hidden -z-1 absolute bottom-20 right-0 start-12 top-0 block"
        event="pointerup"
        action="toggle:paused"
      />
      <Gesture className="absolute inset-0 z-0 block h-full w-full" event="dblpointerup" action="toggle:fullscreen" />
    </>
  );
}
