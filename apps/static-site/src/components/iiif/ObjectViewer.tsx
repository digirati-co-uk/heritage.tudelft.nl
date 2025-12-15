"use client";

import { Link, getObjectSlug } from "@/i18n/navigation";
import { Dialog } from "@headlessui/react";
import { useState } from "react";
import { usePress } from "react-aria";
import { Button } from "react-aria-components";
import { CanvasPanel, useManifest } from "react-iiif-vault";
import { CloseIcon } from "../icons/CloseIcon";
import { AutoLanguage } from "../pages/AutoLanguage";

export function ObjectViewer({
  className,
  objectLink,
  objectCanvasId,
  children,
}: {
  className?: string;
  objectLink?: string;
  objectCanvasId?: string;
  children: React.ReactNode;
}) {
  const manifest = useManifest();
  const [isOpen, setIsOpen] = useState(false);
  const open = usePress({
    onPress: () => setIsOpen(true),
  });

  return (
    <>
      <Dialog className="relative z-50" open={isOpen} onClose={() => setIsOpen(false)}>
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="mobile-height fixed inset-0 flex w-screen flex-row items-center p-4">
          <Button
            className="absolute right-8 top-8 z-20 flex h-12 w-12 items-center justify-center rounded bg-slate-900 hover:bg-slate-800"
            onPress={() => setIsOpen(false)}
          >
            <CloseIcon fill="#fff" />
          </Button>
          <Dialog.Panel className="relative flex h-full w-full flex-col justify-center overflow-y-auto overflow-x-hidden rounded bg-white">
            <div className="min-h-0 flex-1">
              <CanvasPanel.Viewer>
                <CanvasPanel.RenderCanvas />
              </CanvasPanel.Viewer>
            </div>

            <footer className="flex flex-col items-center gap-8 bg-black p-8 text-white md:min-h-32 md:flex-row">
              <div className="flex-1">
                <div>
                  <AutoLanguage>{manifest?.label}</AutoLanguage>
                </div>
                <div>
                  <AutoLanguage>{manifest?.summary}</AutoLanguage>
                </div>
              </div>
              {objectLink ? (
                <Link
                  href={`/${getObjectSlug(objectLink)}${objectCanvasId ? `?c=${objectCanvasId}` : ""}`}
                  className="underline underline-offset-4"
                >
                  View object
                </Link>
              ) : null}
            </footer>
          </Dialog.Panel>
        </div>
      </Dialog>
      <div className={className} {...open.pressProps}>
        {children}
      </div>
    </>
  );
}
