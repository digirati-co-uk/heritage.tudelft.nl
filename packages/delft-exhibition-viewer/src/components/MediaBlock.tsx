import { getClassName } from "../helpers/exhibition";
import { Dialog } from "@headlessui/react";
import type { Canvas } from "@iiif/presentation-3";
import { useState } from "react";
import { type MediaStrategy, type SingleYouTubeVideo, useThumbnail } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { CloseIcon } from "./CloseIcon";
import { CanvasContext } from "react-iiif-vault";
import { LocaleString } from "react-iiif-vault";

export interface MediaBlockProps {
  canvas: Canvas;
  strategy: MediaStrategy;
  index: number;
}

function getWindowHost() {
  return typeof window !== "undefined" ? window.location.host : "";
}

function MediaBlockInner(props: MediaBlockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const className = getClassName(props.canvas.behavior);
  const thumbnail = useThumbnail({ width: 1024, height: 1024 });
  const media = props.strategy.media as SingleYouTubeVideo;
  if (props.strategy.media.type !== "VideoYouTube") return null;
  const annotation = media.annotation;

  return (
    <section className={twMerge("cut-corners bg-black text-white", className)}>
      <img className="h-full w-full object-cover" src={thumbnail?.id} alt="" onClick={() => setIsOpen(true)} />

      <Dialog className="relative z-50" open={isOpen} onClose={() => setIsOpen(false)}>
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="mobile-height fixed inset-0 flex w-screen items-center p-4">
          <button
            className="absolute right-6 top-6 z-20 flex h-16 w-16 items-center justify-center rounded bg-black hover:bg-slate-900"
            onClick={() => setIsOpen(false)}
          >
            <CloseIcon fill="#fff" />
          </button>
          <Dialog.Panel className="relative flex h-full w-full flex-col justify-center overflow-y-auto overflow-x-hidden rounded bg-black">
            <div className="w-full flex-1">
              <iframe
                className="h-full w-full border-none object-cover"
                src={`https://www.youtube.com/embed/${(media as SingleYouTubeVideo).youTubeId}?enablejsapi=1&origin=${getWindowHost()}&autoplay=1&modestbranding=1&rel=0`}
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-presentation"
              ></iframe>
            </div>
            <div className="p-8 text-white">
              {annotation?.label ? (
                <h3 className="mb-2 uppercase">
                  <LocaleString>{annotation.label}</LocaleString>
                </h3>
              ) : null}
              <p>{annotation?.summary ? <LocaleString>{annotation.summary}</LocaleString> : null}</p>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </section>
  );
}

export function MediaBlock(props: MediaBlockProps) {
  return (
    <CanvasContext canvas={props.canvas.id} key={props.canvas.id}>
      <MediaBlockInner {...props} />
    </CanvasContext>
  );
}
