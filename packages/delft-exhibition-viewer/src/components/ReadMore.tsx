import { Dialog } from "@headlessui/react";
import { useState } from "react";
import { CanvasContext, LocaleString } from "react-iiif-vault";
import { CloseIcon } from "./CloseIcon";
import { InfoBlockContentsInner } from "./InfoBlockContents";

function ReadMoreBlockInner() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Dialog
        className="relative z-50"
        open={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="mobile-height fixed inset-0 flex w-screen items-center p-4">
          <button
            className="absolute right-8 top-8 z-10 flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100"
            onClick={() => setIsOpen(false)}
          >
            <CloseIcon />
          </button>
          <Dialog.Panel className="relative flex h-full w-full justify-center overflow-y-auto overflow-x-hidden rounded bg-white">
            <InfoBlockContentsInner />
          </Dialog.Panel>
        </div>
      </Dialog>
      <button
        onClick={() => setIsOpen(true)}
        className="underline underline-offset-4"
      >
        <LocaleString>Read more</LocaleString>
      </button>
    </>
  );
}

export default function ReadMoreBlock(props: { canvasId: string }) {
  return (
    <CanvasContext canvas={props.canvasId}>
      <ReadMoreBlockInner />
    </CanvasContext>
  );
}
