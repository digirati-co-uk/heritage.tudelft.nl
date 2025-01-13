"use client";

import { Dialog } from "@headlessui/react";
import { useLocale } from "next-intl";
import { useState } from "react";
import { CanvasContext, useCanvas, useVault } from "react-iiif-vault";
import { CloseIcon } from "../atoms/CloseIcon";
import { AutoLanguage } from "../pages/AutoLanguage";

type Content = {
  readMore: string;
};

function ReadMoreBlockInner({ content }: { content: Content }) {
  const canvas = useCanvas();
  const vault = useVault();
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  if (!canvas) return null;

  const annotationPage = vault.get(canvas.annotations || []);
  const annotations = vault.get(annotationPage.flatMap((page) => page.items || []));

  if (!annotations.length) {
    return null;
  }

  return (
    <>
      <Dialog className="relative z-50" open={isOpen} onClose={() => setIsOpen(false)}>
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="mobile-height fixed inset-0 flex w-screen items-center p-4">
          <button
            className="absolute right-8 top-8 z-10 flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100"
            onClick={() => setIsOpen(false)}
          >
            <CloseIcon />
          </button>
          <Dialog.Panel className="relative flex h-full w-full justify-center overflow-y-auto overflow-x-hidden rounded bg-white">
            <article className="prose prose-lg h-fit max-w-2xl leading-snug md:leading-normal">
              {annotations.map((annotation: any) => {
                const bodies = vault.get(Array.isArray(annotation.body) ? annotation.body : [annotation.body]);
                const toShow = bodies.length === 1 ? bodies : bodies.filter((t) => (t as any).language === locale);

                return toShow.map((body: any, key: number) => {
                  return (
                    <AutoLanguage key={annotation.id + key} lines html className="mb-3">
                      {body.value}
                    </AutoLanguage>
                  );
                });
              })}
            </article>
          </Dialog.Panel>
        </div>
      </Dialog>
      <button onClick={() => setIsOpen(true)} className="underline underline-offset-4">
        {content.readMore}
      </button>
    </>
  );
}

export default function ReadMoreBlock(props: { content: { readMore: string }; canvasId: string }) {
  return (
    <CanvasContext canvas={props.canvasId}>
      <ReadMoreBlockInner content={props.content} />
    </CanvasContext>
  );
}
