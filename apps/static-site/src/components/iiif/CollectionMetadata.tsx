"use client";

import { Dialog } from "@headlessui/react";
import type { InternationalString, MetadataItem } from "@iiif/presentation-3";
import { useState } from "react";
import { Metadata } from "react-iiif-vault";
import { CloseIcon } from "../icons/CloseIcon";
import { AutoLanguage } from "../pages/AutoLanguage";

export function CollectionMetadata({
  metadata,
}: {
  metadata?: MetadataItem[];
}) {
  return (
    <Metadata
      allowHtml
      metadata={metadata}
      classes={{
        row: "block",
        label: "block uppercase font-mono",
        value: "block text-xl mb-5 with-link",
      }}
    />
  );
}

export function CollectionSummary({
  label,
  summary,
  content,
}: {
  label?: InternationalString;
  summary?: InternationalString;
  content: {
    summary: string;
    readMore: string;
  };
}) {
  const [isOpen, setIsOpen] = useState(false);
  // const briefSummary = Object.entriessummary
  return (
    <div>
      <h3 className="font-mono uppercase">{content.summary}</h3>

      <AutoLanguage
        first
        className="mb-5 block max-h-64 overflow-hidden text-ellipsis text-xl"
      >
        {summary}
      </AutoLanguage>

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
            <article className="prose prose-lg mt-16 h-fit max-w-2xl leading-snug md:leading-normal">
              <h2>
                <AutoLanguage>{label}</AutoLanguage>
              </h2>
              <AutoLanguage lines html className="mb-3">
                {summary}
              </AutoLanguage>
            </article>
          </Dialog.Panel>
        </div>
      </Dialog>
      <button
        onClick={() => setIsOpen(true)}
        className="my-4 block underline underline-offset-4"
      >
        {content.readMore}
      </button>
    </div>
  );
}
