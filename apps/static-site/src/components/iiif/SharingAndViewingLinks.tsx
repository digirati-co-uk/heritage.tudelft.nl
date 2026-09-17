"use client";
import viewerConfig from "@/viewers.json";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { CopyToClipboard } from "../atoms/CopyToClipboard";
import { EditInManifestEditor } from "../atoms/EditInManifestEditor";
import { LinkIcon } from "../icons/LinkIcon";
import { OpenModalIcon } from "../icons/OpenModalIcon";
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

export function SharingAndViewingLinks({
  resource,
  content,
  sharingOptionsOpen,
  setSharingOptionsOpen,
  useBackgroundColor,
}: {
  resource: {
    id: string;
    type: string;
  };
  content: SharingAndViewingLinksContent;
  sharingOptionsOpen: boolean;
  setSharingOptionsOpen?: (open: boolean) => void;
  useBackgroundColor?: boolean;
}) {
  const [sharingExpanded, setSharingExpanded] = useState(false);
  const configuredViewers = viewerConfig.viewers.filter((viewer) => viewer.enabled?.includes(resource.type));
  const t = useTranslations();

  const colorClasses = useBackgroundColor ? "bg-[var(--card-color)] text-black" : "bg-black text-white";
  const hoverClasses = useBackgroundColor ? "hover:text-black/50" : "hover:text-slate-300";

  return (
    <>
      {resource.type === "object" ? (
        // Could change in the future to allow editing of collections
        <EditInManifestEditor id={resource.id} preset="manifest" />
      ) : null}
      {configuredViewers.length === 0 ? null : (
        <div className="overflow-hidden font-mono">
          <div className={twMerge("cut-corners w-full place-self-start p-5", colorClasses)}>
            <h3 className="mb-4 uppercase">{content.sharingViewers}</h3>
            <ul className="text-md flex list-none flex-col gap-1 underline-offset-4">
              <li className="flex items-center gap-4">
                <IIIFLogo className={twMerge("translate-x-[2px] text-xl", hoverClasses)} title={content.iiifLabel} />
                <CopyToClipboard
                  href={resource.id}
                  target="_blank"
                  copiedText={content.copiedMessage}
                  rel="noreferrer"
                  className={`underline data-[copied=true]:no-underline data-[copied=true]:opacity-50 ${hoverClasses}`}
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
                  className={`underline data-[copied=true]:no-underline data-[copied=true]:opacity-50 ${hoverClasses}`}
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
                      className={`underline ${hoverClasses}`}
                      rel="noreferrer"
                    >
                      <AutoLanguage>{viewer.label}</AutoLanguage>
                    </a>
                  </li>
                );
              })}
              {setSharingOptionsOpen && (
                <li key="sharing-options" className="flex items-center gap-3">
                  <OpenModalIcon className="text-2xl opacity-50" />
                  <button
                    type="button"
                    className="underline ml-1"
                    onClick={() => setSharingOptionsOpen(!sharingOptionsOpen)}
                  >
                    {t("Sharing options")}
                  </button>
                </li>
              )}
              {configuredViewers.length > viewerConfig.showMax ? (
                <li className="mt-4">
                  <button
                    type="button"
                    onClick={() => setSharingExpanded(!sharingExpanded)}
                    className={`uppercase hover:underline ${hoverClasses}`}
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
