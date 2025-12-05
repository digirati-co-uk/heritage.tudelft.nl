import { CloseIcon } from "@/components/icons/CloseIcon";
import { useInfoBlockContents } from "@/hooks/use-info-box-contents";
import { Dialog } from "@headlessui/react";
import { useState } from "react";
import { usePress } from "react-aria";
import { LocaleString } from "react-iiif-vault";
import { InfoBlockContentsInner } from "./InfoBlockContents";

export function ReadMoreBlock() {
  const [isOpen, setIsOpen] = useState(false);
  const annotationsToShow = useInfoBlockContents();
  const { pressProps: closeProps } = usePress({
    onPress: () => setIsOpen(false),
  });
  const { pressProps: openProps } = usePress({
    onPress: () => setIsOpen(true),
  });

  if (annotationsToShow.length === 0) {
    return null;
  }

  return (
    <>
      <Dialog className="relative z-50" open={isOpen} onClose={() => setIsOpen(false)}>
        <div className="fixed modal-top left-0 right-0 bottom-0 bg-black/30" aria-hidden="true" />
        <div className="mobile-height fixed modal-top left-0 right-0 bottom-0 flex w-screen items-center p-4">
          <button
            className="absolute right-8 top-8 z-10 flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100"
            onClick={() => setIsOpen(false)}
            {...closeProps}
          >
            <CloseIcon />
          </button>
          <Dialog.Panel className="relative flex h-full w-full justify-center overflow-y-auto overflow-x-hidden rounded bg-white">
            <InfoBlockContentsInner />
          </Dialog.Panel>
        </div>
      </Dialog>
      <button className="underline underline-offset-4" {...openProps}>
        <LocaleString>Read more</LocaleString>
      </button>
    </>
  );
}
