import { CloseIcon } from "@/components/icons/CloseIcon";
import { useInfoBlockContents } from "@/hooks/use-info-box-contents";
import { Dialog } from "@headlessui/react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { LocaleString } from "react-iiif-vault";
import { isModalOpenSuppressed, stopModalEvent, suppressModalOpen } from "@/helpers/modal-interaction";
import { InfoBlockContentsInner } from "./InfoBlockContents";

export function ReadMoreBlock({
  label = "Read more",
  isOpen: controlledIsOpen,
  onOpenChange,
}: {
  label?: string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}) {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const isOpen = controlledIsOpen ?? uncontrolledIsOpen;
  const setIsOpen = onOpenChange ?? setUncontrolledIsOpen;
  const annotationsToShow = useInfoBlockContents();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setScrollbarWidth(0);
      return;
    }

    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    const updateScrollbarWidth = () => {
      const hasVerticalScrollbar = scrollContainer.scrollHeight > scrollContainer.clientHeight + 1;
      const nextScrollbarWidth = hasVerticalScrollbar ? scrollContainer.offsetWidth - scrollContainer.clientWidth : 0;

      setScrollbarWidth(Math.max(0, nextScrollbarWidth));
    };

    updateScrollbarWidth();
    const frameId = window.requestAnimationFrame(updateScrollbarWidth);
    window.addEventListener("resize", updateScrollbarWidth);

    if (typeof ResizeObserver === "undefined") {
      return () => {
        window.cancelAnimationFrame(frameId);
        window.removeEventListener("resize", updateScrollbarWidth);
      };
    }

    const resizeObserver = new ResizeObserver(updateScrollbarWidth);
    resizeObserver.observe(scrollContainer);

    if (scrollContainer.firstElementChild) {
      resizeObserver.observe(scrollContainer.firstElementChild);
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateScrollbarWidth);
      resizeObserver.disconnect();
    };
  }, [annotationsToShow.length, isOpen]);

  if (annotationsToShow.length === 0) {
    return null;
  }

  return (
    <>
      <Dialog
        className="exhibition-viewer exhibition-viewer-dialog"
        open={isOpen}
        onClose={(event) => {
          suppressModalOpen(event);
          setIsOpen(false);
        }}
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="fixed modal-top left-0 right-0 bottom-0 bg-black/30" aria-hidden="true" />
        <div className="mobile-height fixed modal-top left-0 right-0 bottom-0 flex w-screen items-center justify-center p-4">
          <Dialog.Panel
            className="relative flex max-h-full w-full max-w-[40rem] overflow-hidden rounded-lg bg-white/95 shadow-lg"
            style={
              {
                "--read-more-scrollbar-width": `${scrollbarWidth}px`,
              } as CSSProperties
            }
          >
            <button
              type="button"
              aria-label="Close"
              className="absolute right-[calc(0.75rem+var(--read-more-scrollbar-width))] top-3 z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-white text-black shadow-sm ring-1 ring-black/10 hover:bg-slate-100 md:right-[calc(1rem+var(--read-more-scrollbar-width))] md:top-4"
              onClick={(event) => {
                suppressModalOpen(event);
                setIsOpen(false);
              }}
            >
              <CloseIcon fill="currentColor" />
            </button>
            <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-10 md:p-11">
              <InfoBlockContentsInner className="max-w-none [&>*:first-child]:mt-0 [&>*:first-child>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&>*:last-child>*:last-child]:mb-0" />
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
      <button
        type="button"
        className="underline underline-offset-4"
        onClick={(event) => {
          event.stopPropagation();
          if (isModalOpenSuppressed()) {
            stopModalEvent(event);
            return;
          }
          setIsOpen(true);
        }}
      >
        <LocaleString>{label}</LocaleString>
      </button>
    </>
  );
}
