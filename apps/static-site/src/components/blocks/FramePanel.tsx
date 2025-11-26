"use client";
import { Dialog } from "@headlessui/react";
import { block } from "@page-blocks/react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { z } from "zod";
import { CloseIcon } from "../icons/CloseIcon";

const boxProps = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  type: z.string().optional(),
  frameUrl: z.string(),
  frameLabel: z.string(),
  frameDescription: z.string(),
  fullHeight: z.boolean().optional(),
  backgroundColor: z
    .enum([
      "bg-orange-500",
      "bg-yellow-400",
      "bg-orange-400",
      "bg-green-500",
      "bg-blue-500",
      "bg-cyan-500",
      "bg-indigo-500",
      "bg-purple-400",
    ])
    .optional(),
  fallbackBackgroundColor: z.string().optional(),
  backgroundImage: z.string().optional(),
  dark: z.boolean().optional(),
  small: z.boolean().optional(),
  unfiltered: z.boolean().optional(),
  className: z.string().optional(),
});

export default block(
  {
    label: "Iframe panel",
    props: boxProps,
  },
  function FramePanel(props: z.infer<typeof boxProps>) {
    const [isOpen, setIsOpen] = useState(false);
    const titleSize = props.small ? "md:text-xl" : "text-2xl md:text-4xl";
    const filters = props.unfiltered ? "" : "grayscale";
    const fallbackBackground = props.fallbackBackgroundColor || "bg-yellow-400";
    const height = props.fullHeight ? "h-full" : "aspect-square";

    if (!props.frameUrl) return null;

    return (
      <div
        className={twMerge(
          `cut-corners group relative flex`,
          height,
          props.className,
        )}
      >
        <div
          className={`relative z-20 cursor-pointer p-5 ${
            props.dark ? "text-black" : "text-white"
          } flex h-full w-full flex-col justify-between gap-3 no-underline`}
          onClick={() => setIsOpen(true)}
        >
          <div className="text-md text-center font-mono uppercase">
            {props.type || " "}
          </div>
          <div className={`mx-auto text-center ${titleSize} font-medium`}>
            {props.title || " "}
          </div>
          <div className="text-center">{props.subtitle || " "}</div>
        </div>

        <div
          className={`safe-inset absolute inset-0 z-10 overflow-hidden ${fallbackBackground}`}
        >
          {props.backgroundImage ? (
            <img
              alt=""
              className={`h-full w-full object-cover ${filters} scale-105 transition-transform duration-1000 ease-in-out group-hover:scale-110`}
              src={props.backgroundImage}
            />
          ) : null}
          {props.backgroundColor ? (
            <div
              className={`safe-inset absolute inset-0 mix-blend-multiply ${props.backgroundColor} pointer-events-none`}
            ></div>
          ) : null}
        </div>

        <Dialog
          className="relative z-50"
          open={isOpen}
          onClose={() => setIsOpen(false)}
        >
          <div
            className="safe-inset fixed inset-0 bg-black/30"
            aria-hidden="true"
          />
          <div className="safe-inset mobile-height fixed inset-0 flex w-screen items-center">
            <button
              className="absolute right-6 top-6 z-20 flex h-16 w-16 items-center justify-center rounded bg-black hover:bg-slate-900"
              onClick={() => setIsOpen(false)}
            >
              <CloseIcon fill="#fff" />
            </button>
            <Dialog.Panel className="relative flex h-full w-full flex-col justify-center overflow-y-auto overflow-x-hidden rounded bg-black">
              <div className="w-full flex-1">
                <iframe
                  className="h-full min-h-0 w-full border-none object-cover"
                  src={props.frameUrl}
                  referrerPolicy="no-referrer"
                  allow="autoplay"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                ></iframe>
              </div>

              <footer className="flex flex-shrink-0 flex-col items-center gap-8 bg-black p-8 text-white md:min-h-32 md:flex-row">
                <div className="flex-1">
                  <div>{props.frameLabel}</div>
                  <div>{props.frameDescription}</div>
                </div>
                <a
                  className="underline underline-offset-4"
                  href={props.frameUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in new window
                </a>
              </footer>
            </Dialog.Panel>
          </div>
        </Dialog>
      </div>
    );
  },
);
