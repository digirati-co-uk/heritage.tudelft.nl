"use client";
import { Dialog } from "@headlessui/react";
import { block } from "@page-blocks/react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { z } from "zod";
import { CloseIcon } from "../atoms/CloseIcon";

export default block(
  {
    label: "Frame panel",
    props: z.object({
      label: z.string().optional(),
      description: z.string().optional(),
      frameUrl: z.string(),
      thumbnail: z.string(),
      className: z.string().optional(),
    }),
  },
  function FramePanel({ thumbnail, frameUrl, label, className, description }) {
    const [isOpen, setIsOpen] = useState(false);

    if (!thumbnail || !frameUrl) return null;

    return (
      <div className={twMerge("cut-corners bg-black text-white", className)}>
        <img className="h-full w-full object-cover" src={thumbnail} alt="" onClick={() => setIsOpen(true)} />

        <Dialog className="relative z-50" open={isOpen} onClose={() => setIsOpen(false)}>
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex h-screen w-screen items-center p-4">
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
                  src={frameUrl}
                  referrerPolicy="no-referrer"
                  allow="autoplay"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                ></iframe>
              </div>
              <div className="p-8 text-white">
                <div className="uppercase">{label}</div>
                <div>{description}</div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </div>
    );
  }
);
