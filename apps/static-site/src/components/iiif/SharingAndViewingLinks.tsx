"use client";
import viewerConfig from "@/viewers.json";
import { useState } from "react";
import { useSimpleViewer } from "react-iiif-vault";
import { AutoLanguage } from "../pages/AutoLanguage";

export type SharingAndViewingLinksContent = {
  sharingViewers: string;
  showMore: string;
  showLess: string;
  currentPage: string;
};

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
      {configuredViewers.length === 0 ? null : (
        <div className="overflow-hidden font-mono">
          <div className="cut-corners w-full place-self-start bg-black p-8 text-white">
            <h3 className="mb-2 uppercase">{content.sharingViewers}:</h3>
            <ul className="text-md list-none underline underline-offset-4">
              <li>
                <a
                  suppressHydrationWarning
                  href={
                    typeof window !== "undefined" ? window.location.href.replace("/en/", "/").replace("/nl/", "/") : ""
                  }
                  target="_blank"
                  className="hover:text-slate-300"
                  rel="noreferrer"
                >
                  {content.currentPage}
                </a>
              </li>
              {configuredViewers.map((viewer, i) => {
                if (!sharingExpanded && i > viewerConfig.showMax - 1) return null;

                return (
                  <li key={viewer.id}>
                    <a
                      href={viewer.link.replace("{url}", resource.id)}
                      target="_blank"
                      className="hover:text-slate-300"
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
