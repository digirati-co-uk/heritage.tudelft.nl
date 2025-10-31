import { AutoLanguage } from "../pages/AutoLanguage";
import {
  type ZoomRegion,
  updateStateSharingLink,
  updateCustomSharingLink,
} from "@/helpers/content-state";
import { useState, useEffect } from "react";
import { CopyToClipboard } from "../atoms/CopyToClipboard";
import { CopyToClipboardIcon } from "../icons/CopyToClipboardIcon";
import { useAtlasStore } from "react-iiif-vault";
import { useStore } from "zustand";
import { InternationalString } from "@iiif/presentation-3";

export function SharingOptions({
  //onChange,
  manifestId,
  initCanvasURI,
  initCanvasSeqIdx = 0,
  initCanvasLabel,
  initZoomRegion,
}: {
  // onChange: (
  //   viewports: Record<
  //     string,
  //     { x: number; y: number; width: number; height: number }
  //   >,
  // ) => void;
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
            <AutoLanguage>Share a link to this resource.</AutoLanguage>
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
            <div className="w-52">Include current canvas:</div>
            <div className="text-gray-600 flex flex-col md:flex-row gap-1 md:gap-3">
              <div>
                Page number:{" "}
                <span className="text-gray-900">{initCanvasSeqIdx + 1}</span>
              </div>
              <div>
                Label:{" "}
                <span className="text-gray-900">
                  "<AutoLanguage>{initCanvasLabel}</AutoLanguage>"
                </span>
              </div>
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
            <div className="w-52">Include current zoom region:</div>
            {zoomRegion && (
              <div className="text-gray-600 flex flex-col md:flex-row gap-1 md:gap-3">
                <div className="flex flex-col gap-1 md:flex-row md:gap-3">
                  <div className="flex flex-col md:flex-row md:gap-3">
                    <div>
                      x:{" "}
                      <span className="text-gray-900">
                        {+zoomRegion?.x.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      y:{" "}
                      <span className="text-gray-900">
                        {+zoomRegion?.y.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:gap-3">
                    <div>
                      width:{" "}
                      <span className="text-gray-900">
                        {+zoomRegion?.width.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      height:{" "}
                      <span className="text-gray-900">
                        {+zoomRegion?.height.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div>(rounded)</div>
                </div>
              </div>
            )}
          </div>
        </li>
        <li className="bg-gray-100 p-3 pb-4 flex flex-col">
          <CopyToClipboard
            href={stateSharingLink}
            copiedText="Copied!"
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
              <span>Short link for use on this site (copy to clipboard)</span>
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
            copiedText="Copied!"
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
              <span>IIIF Content State (copy to clipboard)</span>
            </div>
            <div className="border border-black">
              <div className="min-h-12 max-h-12 flex flex-wrap p-2 truncate [mask-image:linear-gradient(to_left,transparent,black_100%)]">
                {stateSharingLink}
              </div>
            </div>
          </CopyToClipboard>
        </li>
      </ul>
    </div>
  );
}
