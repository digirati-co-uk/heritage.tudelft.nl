import { Dialog } from "@headlessui/react";
import { useState } from "react";
import { LocaleString } from "react-iiif-vault";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { InfoBlockContentsInner } from "./InfoBlockContents";
import { useInfoBlockContents } from "@/hooks/use-info-box-contents";
import { usePress } from "react-aria";

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
