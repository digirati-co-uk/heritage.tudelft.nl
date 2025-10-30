"use client";
import viewerConfig from "@/viewers.json";
import { type SVGProps, useState } from "react";
import { CopyToClipboard } from "../atoms/CopyToClipboard";
import { EditInManifestEditor } from "../atoms/EditInManifestEditor";
import { AutoLanguage } from "../pages/AutoLanguage";
import { IIIFLogo } from "./IIIFLogo";
import { type ZoomRegion, SharingOptions } from "./SharingOptions";
import { Dialog } from "@headlessui/react";
import { CloseIcon } from "../atoms/CloseIcon";

export type SharingAndViewingLinksContent = {
  sharingViewers: string;
  showMore: string;
  showLess: string;
  currentPage: string;
  copiedMessage: string;
  iiifLabel: string;
};

export function LinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="currentColor"
        d="M11 17H7q-2.075 0-3.537-1.463T2 12t1.463-3.537T7 7h4v2H7q-1.25 0-2.125.875T4 12t.875 2.125T7 15h4zm-3-4v-2h8v2zm5 4v-2h4q1.25 0 2.125-.875T20 12t-.875-2.125T17 9h-4V7h4q2.075 0 3.538 1.463T22 12t-1.463 3.538T17 17z"
      ></path>
    </svg>
  );
}

export function SharingAndViewingLinks({
  resource,
  content,
  canvasURI,
  canvasSeqIdx,
  zoomRegion,
}: {
  resource: {
    id: string;
    type: string;
  };
  content: SharingAndViewingLinksContent;
  canvasURI?: string;
  canvasSeqIdx: number;
  zoomRegion?: ZoomRegion;
}) {
  const [sharingExpanded, setSharingExpanded] = useState(false);
  const [sharingOptionsOpen, setSharingOptionsOpen] = useState(false);
  const configuredViewers = viewerConfig.viewers.filter((viewer) =>
    viewer.enabled?.includes(resource.type),
  );

  console.log(canvasURI, zoomRegion);

  return (
    <>
      {resource.type === "object" ? (
        // Could change in the future to allow editing of collections
        <EditInManifestEditor id={resource.id} preset="manifest" />
      ) : null}
      {configuredViewers.length === 0 ? null : (
        <div className="overflow-hidden font-mono">
          <div className="cut-corners w-full place-self-start bg-black p-5 text-white">
            <h3 className="mb-4 uppercase">{content.sharingViewers}</h3>
            <ul className="text-md flex list-none flex-col gap-1 underline-offset-4">
              <li className="flex items-center gap-4">
                <IIIFLogo
                  className="translate-x-[2px] text-xl text-slate-300"
                  title={content.iiifLabel}
                />
                <CopyToClipboard
                  href={resource.id}
                  target="_blank"
                  copiedText={content.copiedMessage}
                  rel="noreferrer"
                  className="underline hover:text-slate-300 data-[copied=true]:no-underline data-[copied=true]:opacity-50"
                >
                  {content.iiifLabel}
                </CopyToClipboard>
              </li>
              <li className="flex items-center gap-3">
                <LinkIcon className="text-2xl opacity-50" />
                <CopyToClipboard
                  suppressHydrationWarning
                  copiedText={content.copiedMessage}
                  href={
                    typeof window !== "undefined"
                      ? window.location.href
                          .replace("/en/", "/")
                          .replace("/nl/", "/")
                      : ""
                  }
                  target="_blank"
                  className="underline hover:text-slate-300 data-[copied=true]:no-underline data-[copied=true]:opacity-50"
                  rel="noreferrer"
                >
                  {content.currentPage}
                </CopyToClipboard>
              </li>
              {configuredViewers.map((viewer, i) => {
                if (!sharingExpanded && i > viewerConfig.showMax - 1)
                  return null;

                return (
                  <li key={viewer.id} className="flex items-center gap-3">
                    <LinkIcon className="text-2xl opacity-50" />
                    <a
                      href={viewer.link.replace("{url}", resource.id)}
                      target="_blank"
                      className="underline hover:text-slate-300"
                      rel="noreferrer"
                    >
                      <AutoLanguage>{viewer.label}</AutoLanguage>
                    </a>
                  </li>
                );
              })}
              <li key="sharing-options" className="flex items-center gap-3">
                <LinkIcon className="text-2xl opacity-50" />
                <button
                  className="underline"
                  onClick={() => setSharingOptionsOpen(!sharingOptionsOpen)}
                >
                  <AutoLanguage>Sharing options</AutoLanguage>
                </button>
                <Dialog
                  className="relative z-50"
                  open={sharingOptionsOpen}
                  onClose={() => setSharingOptionsOpen(false)}
                >
                  <div className="fixed inset-0 bg-black/30 flex flex-row" />
                  <div className="w-[50vw] h-96] fixed inset-0 justify-self-center p-4">
                    <button
                      className="absolute right-8 top-8 z-20 flex h-12 w-12 items-center justify-center rounded"
                      onClick={() => setSharingOptionsOpen(false)}
                    >
                      <CloseIcon />
                    </button>
                    <Dialog.Panel className="relative flex h-full w-full flex-col justify-center overflow-y-auto overflow-x-hidden rounded bg-white">
                      <div className="min-h-0 flex-1 p-4 mt-8">
                        <SharingOptions
                          manifestId={resource.id}
                          initCanvasURI={canvasURI}
                          initCanvasSeqIdx={canvasSeqIdx}
                          initZoomRegion={zoomRegion}
                        />
                      </div>
                    </Dialog.Panel>
                  </div>
                </Dialog>
              </li>
              {/* {sharingOptionsOpen && (
                <SharingOptions
                  manifestId={resource.id}
                  initCanvasURI={canvasURI}
                  initZoomRegion={zoomRegion}
                />
              )} */}
              {configuredViewers.length > viewerConfig.showMax ? (
                <li className="mt-4">
                  <button
                    onClick={() => setSharingExpanded(!sharingExpanded)}
                    className="uppercase hover:text-slate-300 hover:underline"
                  >
                    {sharingExpanded
                      ? `${content.showLess} -`
                      : `${content.showMore} +`}
                  </button>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
