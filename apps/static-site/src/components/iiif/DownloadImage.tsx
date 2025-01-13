"use client";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CanvasContext,
  ContextBridge,
  useCanvas,
  useContextBridge,
  useRenderingStrategy,
  useSimpleViewer,
  useVault,
  useVaultSelector,
} from "react-iiif-vault";
import { AutoLanguage } from "../pages/AutoLanguage";

export function DownloadImage({ content }: { content: { downloadImage: string } }) {
  const { currentSequenceIndex, sequence, items } = useSimpleViewer();

  const canvases = (sequence[currentSequenceIndex] || []).map((t) => items[t] as any);

  return (
    <div className="overflow-hidden font-mono">
      <div className="cut-corners w-full place-self-start bg-black p-4 text-white">
        <h3 className="mb-2 uppercase">{content.downloadImage}:</h3>
        {canvases.map((canvas) => {
          return (
            <CanvasContext key={canvas.id} canvas={canvas.id}>
              <DownloadImageInner single={canvases.length === 1} />
            </CanvasContext>
          );
        })}
      </div>
    </div>
  );
}

function DownloadImageInner({ single }: { single?: boolean }) {
  const canvas = useCanvas();
  const [strategy] = useRenderingStrategy();

  if (strategy.type === "images") {
    const service = strategy.image.service;
    if (service?.sizes) {
      return (
        <>
          {single ? null : <AutoLanguage className="text-xs uppercase">{canvas?.label}</AutoLanguage>}

          <ul className="text-md mb-4 list-none underline-offset-4">
            {service.sizes
              .toSorted((a, b) => a.width - b.width)
              .map((size, n) => (
                <div key={size.width}>
                  ⇨{" "}
                  <a className="underline" href={`${service.id}/full/${size.width},/0/default.jpg`}>
                    Image ({size.width} x {size.height})
                  </a>
                </div>
              ))}
          </ul>
        </>
      );
    }
  }

  // @todo more options for different rendering strategies.
  return null;
}
