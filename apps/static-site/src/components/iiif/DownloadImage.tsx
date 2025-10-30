"use client";
import type { ContentResource, Reference } from "@iiif/presentation-3";
import { type SVGProps, useMemo } from "react";
import {
  CanvasContext,
  LocaleString,
  useCanvas,
  useManifest,
  useRenderingStrategy,
  useSimpleViewer,
  useVault,
} from "react-iiif-vault";
import { AutoLanguage } from "../pages/AutoLanguage";

export function DownloadImage({ content }: { content: { downloadImage: string; download: string } }) {
  const { currentSequenceIndex, sequence, items } = useSimpleViewer();
  const manifest = useManifest();
  const vault = useVault();
  const canvases = useMemo(
    () => (sequence[currentSequenceIndex] || []).map((t) => items[t] as any),
    [sequence, items, currentSequenceIndex],
  );
  const seeAlso = useMemo(() => {
    return vault.get<ContentResource>([
      //
      ...(manifest?.seeAlso || []),
      ...canvases.flatMap((canvas) => canvas.seeAlso || []),
    ]) as ContentResource[];
  }, [manifest, canvases, vault]);

  return (
    <div className="overflow-hidden font-mono">
      <div className="cut-corners w-full place-self-start bg-black p-5 text-white">
        <h3 className="mb-2 uppercase">{content.download}</h3>
        {canvases.map((canvas) => {
          return (
            <CanvasContext key={canvas.id} canvas={canvas.id}>
              <DownloadImageInner single={canvases.length === 1} content={content} />
            </CanvasContext>
          );
        })}
        {seeAlso.length ? (
          <ul className="text-md list-none underline-offset-4">
            {seeAlso.map((resource) => (
              <DownloadSeeAlso key={resource.id} resource={resource} />
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export function ImageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path
        fill="currentColor"
        d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm2-4h10q.3 0 .45-.275t-.05-.525l-2.75-3.675q-.15-.2-.4-.2t-.4.2L11.25 16L9.4 13.525q-.15-.2-.4-.2t-.4.2l-2 2.675q-.2.25-.05.525T7 17"
      ></path>
    </svg>
  );
}

export function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M4 22v-2h16v2zm8-4L5 9h4V2h6v7h4z"></path>
    </svg>
  );
}

export function DataIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      {/* Icon from Google Material Icons by Material Design Authors - https://github.com/material-icons/material-icons/blob/master/LICENSE */}
      <path
        fill="currentColor"
        d="M4 7v2c0 .55-.45 1-1 1H2v4h1c.55 0 1 .45 1 1v2c0 1.65 1.35 3 3 3h3v-2H7c-.55 0-1-.45-1-1v-2c0-1.3-.84-2.42-2-2.83v-.34C5.16 11.42 6 10.3 6 9V7c0-.55.45-1 1-1h3V4H7C5.35 4 4 5.35 4 7m17 3c-.55 0-1-.45-1-1V7c0-1.65-1.35-3-3-3h-3v2h3c.55 0 1 .45 1 1v2c0 1.3.84 2.42 2 2.83v.34c-1.16.41-2 1.52-2 2.83v2c0 .55-.45 1-1 1h-3v2h3c1.65 0 3-1.35 3-3v-2c0-.55.45-1 1-1h1v-4z"
      />
    </svg>
  );
}

function calculateDimensions(fullWidth: number, fullHeight: number, maxArea: number) {
  const aspectRatio = fullWidth / fullHeight;
  const maxHeight = Math.sqrt(maxArea / aspectRatio);
  const maxWidth = maxHeight * aspectRatio;

  return {
    width: Math.floor(maxWidth),
    height: Math.floor(maxHeight),
  };
}

function DownloadSeeAlso({ resource }: { resource: ContentResource }) {
  if (resource.type === "Dataset") {
    return (
      <li className="flex items-center gap-2">
        <DataIcon className="text-2xl text-slate-300 opacity-50" />
        <a className="underline" href={resource.id}>
          <LocaleString>{(resource as any).label || "Dataset"}</LocaleString>
        </a>
      </li>
    );
  }

  return null;
}

function DownloadImageInner({ single, content }: { single?: boolean; content: { downloadImage: string } }) {
  const canvas = useCanvas();
  const [strategy] = useRenderingStrategy();

  if (strategy.type === "images") {
    const { width, height } = strategy.image;
    const service = strategy.image.service;
    const maxArea = service?.maxArea;
    // DLCS returns full image in spite of maxArea property
    // if (maxArea && width && height) {
    //   ({ width, height } = calculateDimensions(width, height, maxArea));
    // }
    const largest = service?.sizes?.toSorted((a, b) => b.width - a.width)[0];
    if (largest) {
      return (
        <>
          {single ? null : <AutoLanguage className="text-xs uppercase">{canvas?.label}</AutoLanguage>}

          <ul className="text-md list-none underline-offset-4">
            <li key={largest.width} className="flex items-center gap-2">
              <DownloadIcon className="text-2xl text-slate-300 opacity-50" />
              <a className="underline" href={`${service.id}/full/${largest.width},/0/default.jpg`}>
                {content.downloadImage} ({largest.width} x {largest.height})
              </a>
            </li>
            <li key={width} className="flex items-center gap-2">
              <DownloadIcon className="text-2xl text-slate-300 opacity-50" />
              <a className="underline" href={`${service.id}/full/max/0/default.jpg`}>
                {content.downloadImage} ({width} x {height})
              </a>
            </li>
          </ul>
        </>
      );
    }
  }

  // @todo more options for different rendering strategies.
  return null;
}
