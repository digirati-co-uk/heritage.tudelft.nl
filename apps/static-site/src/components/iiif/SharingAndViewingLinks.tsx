"use client";
import viewerConfig from "@/viewers.json";
import { type SVGProps, useState } from "react";
import { useSimpleViewer } from "react-iiif-vault";
import { CopyToClipboard } from "../atoms/CopyToClipboard";
import { EditIcon } from "../atoms/EditIcon";
import { EditInManifestEditor } from "../atoms/EditInManifestEditor";
import { AutoLanguage } from "../pages/AutoLanguage";
import { IIIFLogo } from "./IIIFLogo";

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
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
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
}: {
  resource: {
    id: string;
    type: string;
  };
  content: SharingAndViewingLinksContent;
}) {
  const [sharingExpanded, setSharingExpanded] = useState(false);
  const configuredViewers = viewerConfig.viewers.filter((viewer) => viewer.enabled?.includes(resource.type));

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
                <IIIFLogo className="translate-x-[2px] text-xl text-slate-300" title={content.iiifLabel} />
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
                    typeof window !== "undefined" ? window.location.href.replace("/en/", "/").replace("/nl/", "/") : ""
                  }
                  target="_blank"
                  className="underline hover:text-slate-300 data-[copied=true]:no-underline data-[copied=true]:opacity-50"
                  rel="noreferrer"
                >
                  {content.currentPage}
                </CopyToClipboard>
              </li>
              {configuredViewers.map((viewer, i) => {
                if (!sharingExpanded && i > viewerConfig.showMax - 1) return null;

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
              {configuredViewers.length > viewerConfig.showMax ? (
                <li className="mt-4">
                  <button
                    onClick={() => setSharingExpanded(!sharingExpanded)}
                    className="uppercase hover:text-slate-300 hover:underline"
                  >
                    {sharingExpanded ? `${content.showLess} -` : `${content.showMore} +`}
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
