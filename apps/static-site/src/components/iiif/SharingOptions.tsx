import { useAtlasStore } from "react-iiif-vault";
import { InternationalString } from "@iiif/presentation-3";
import {
  type ZoomRegion,
  updateStateSharingLink,
  updateCustomSharingLink,
} from "@/helpers/content-state";
import viewerConfig from "@/viewers.json";
import { useStore } from "zustand";
import { AutoLanguage } from "../pages/AutoLanguage";
import { useState, useEffect } from "react";
import { CopyToClipboard } from "../atoms/CopyToClipboard";
import { CopyToClipboardIcon } from "../icons/CopyToClipboardIcon";
import { LinkIcon } from "../icons/LinkIcon";
import { useTranslations } from "next-intl";

export function SharingOptions({
  manifestId,
  initCanvasURI,
  initCanvasSeqIdx = 0,
  initCanvasLabel,
  initZoomRegion,
}: {
  manifestId: string;
  initCanvasURI?: string;
  initCanvasSeqIdx?: number;
  initCanvasLabel: InternationalString | null | undefined;
  initZoomRegion?: ZoomRegion | null;
}) {
  const [canvasURI, setCanvasURI] = useState<string>(initCanvasURI ?? ""); // setters for future if we allow canvas and region reselection in the Sharing Options dialog.
  const [zoomRegion, setZoomRegion] = useState<ZoomRegion | null | undefined>(
    initZoomRegion,
  );
  const [stateSharingLink, setStateSharingLink] = useState<string>(manifestId);
  const [customSharingLink, setCustomSharingLink] =
    useState<string>(manifestId);
  const [specifyCanvas, setSpecifyCanvas] = useState<boolean>(false);
  const [specifyRegion, setSpecifyRegion] = useState<boolean>(false);
  const atlas = useAtlasStore();
  const canvasViewports = useStore(atlas, (s) => s.canvasViewports);
  const configuredViewers = viewerConfig.viewers.filter((viewer) =>
    viewer.enabled?.includes("object"),
  );
  const t = useTranslations();

  useEffect(() => {
    setZoomRegion(canvasViewports[canvasURI]);
  }, [canvasViewports]);

  useEffect(() => {
    if (!specifyCanvas) setSpecifyRegion(false);
    const stateSharingLink = updateStateSharingLink({
      manifestId: manifestId,
      canvasURI: specifyCanvas ? canvasURI : "",
      zoomRegion: specifyRegion ? zoomRegion : undefined,
    });
    setStateSharingLink(stateSharingLink);
    const customSharingLink = updateCustomSharingLink({
      manifestId: manifestId,
      canvasSeqIdx: specifyCanvas ? initCanvasSeqIdx : 0,
      zoomRegion: specifyRegion ? zoomRegion : undefined,
    });
    setCustomSharingLink(customSharingLink);
  }, [specifyCanvas, specifyRegion]);

  return (
    <div className="text-lg">
      <ul className="flex flex-col gap-3">
        <li className="flex flex-col gap-3">
          <h2 className="text-2xl mb-2">
            {t("Share a link to this resource")}
          </h2>
        </li>
        <li className="flex flex-row gap-2 ml-4 md:items-center">
          <input
            className="w-5 h-5 min-w-5 mt-1 md:mt-0"
            type="checkbox"
            checked={specifyCanvas}
            onChange={() => {
              setSpecifyCanvas(!specifyCanvas);
            }}
          />
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="w-60">{t("Include current canvas")}:</div>
            <div className="text-gray-600 flex flex-col md:flex-row gap-1 md:gap-3">
              <div>
                {t("Page number")}:{" "}
                <span className="text-gray-900">{initCanvasSeqIdx + 1}</span>
              </div>
              {
                <div>
                  {t("Label")}:{" "}
                  <span className="text-gray-900">
                    <AutoLanguage>{initCanvasLabel}</AutoLanguage>
                  </span>
                </div>
              }
            </div>
          </div>
        </li>
        <li className="flex flex-row gap-2 ml-4 mb-3 md:items-center">
          <input
            className="w-5 h-5 min-w-5 mt-1 md:mt-0"
            type="checkbox"
            checked={specifyRegion}
            disabled={!specifyCanvas}
            onChange={() => {
              setSpecifyRegion(!specifyRegion);
            }}
          />
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="w-60">{t("Include current zoom region")}:</div>
            {zoomRegion && (
              <div className="text-gray-600 flex flex-col md:flex-row gap-1 md:gap-3">
                <div className="flex flex-col gap-1 md:flex-row md:gap-3">
                  <div className="flex flex-col md:flex-row md:gap-3">
                    <div>
                      x:{" "}
                      <span className="text-gray-900">
                        {Math.round(zoomRegion?.x)}
                      </span>
                    </div>
                    <div>
                      y:{" "}
                      <span className="text-gray-900">
                        {Math.round(zoomRegion?.y)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:gap-3">
                    <div>
                      {t("width")}:{" "}
                      <span className="text-gray-900">
                        {Math.round(zoomRegion?.width)}
                      </span>
                    </div>
                    <div>
                      {t("height")}:{" "}
                      <span className="text-gray-900">
                        {Math.round(zoomRegion?.height)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </li>
        <li className="bg-gray-100 p-3 pb-4 flex flex-col">
          <CopyToClipboard
            href={customSharingLink}
            copiedText={t("Copied")}
            target="_blank"
            className="pointer"
            rel="noreferrer"
          >
            <div className="flex flex-row gap-2 items-center mb-1">
              <CopyToClipboardIcon
                className="text-gray-600 min-w-6"
                width="1.3em"
                height="1.3em"
              />
              <span>
                {t("Short link for use on this site")} ({t("copy to clipboard")}
                )
              </span>
            </div>
            <div className="border border-black">
              <div className="min-h-12 flex flex-wrap p-2 truncate [mask-image:linear-gradient(to_left,transparent,black_100%)]">
                {customSharingLink}
              </div>
            </div>
          </CopyToClipboard>
        </li>
        <li className="bg-gray-100 p-3 pb-4 flex flex-col">
          <CopyToClipboard
            href={stateSharingLink}
            copiedText={t("Copied")}
            target="_blank"
            className="pointer"
            rel="noreferrer"
          >
            <div className="flex flex-row gap-2 items-center mb-1">
              <CopyToClipboardIcon
                className="text-gray-600 min-w-6"
                width="1.3em"
                height="1.3em"
              />
              <span>
                {t("IIIF Content State")} ({t("copy to clipboard")})
              </span>
            </div>
            <div className="border border-black">
              <div className="min-h-12 max-h-12 flex flex-wrap p-2 truncate [mask-image:linear-gradient(to_left,transparent,black_100%)]">
                {stateSharingLink}
              </div>
            </div>
          </CopyToClipboard>
        </li>
        <li>
          <ul className="flex flex-col gap mt-1">
            {configuredViewers
              .filter((v) => ["theseus", "clover"].includes(v.id))
              .map((viewer) => {
                return (
                  <li
                    key={`sharinglink_${viewer.id}`}
                    className="flex flex-row gap-2 items-center ml-3"
                  >
                    <LinkIcon className="text-2xl opacity-50" />
                    <a
                      href={viewer.link.replace("{url}", stateSharingLink)}
                      target="_blank"
                      className="underline hover:text-slate-600"
                      rel="noreferrer"
                    >
                      <AutoLanguage>{viewer.label}</AutoLanguage>
                    </a>
                  </li>
                );
              })}
          </ul>
        </li>
      </ul>
    </div>
  );
}
