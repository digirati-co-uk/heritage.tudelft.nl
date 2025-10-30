import { AutoLanguage } from "../pages/AutoLanguage";
import {
  type ZoomRegion,
  updateStateSharingLink,
  updateCustomSharingLink,
} from "@/helpers/content-state";
import { useState, useEffect } from "react";
import { CopyToClipboard } from "../atoms/CopyToClipboard";
import { CopyToClipboardIcon } from "../atoms/CopyToClipboardIcon";
import { useAtlasStore } from "react-iiif-vault";
import { useStore } from "zustand";

export function SharingOptions({
  //onChange,
  manifestId,
  initCanvasURI,
  initCanvasSeqIdx = 0,
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
    <div>
      <ul className="flex flex-col gap-3">
        <li className="flex flex-col gap-3">
          <h2 className="text-xl">
            <AutoLanguage>Share Link to this resource.</AutoLanguage>
          </h2>
          <span className="bg-gray-100 p-3">
            <ul>
              <li>
                - Check the checkboxes for your link to open the current Canvas
                and Zoom Region.
              </li>
              <li>
                - Links can be shared in two formats:
                <br />
                <ul className="ml-2">
                  <li>- Short link that can be used on this site only,</li>
                  <li>
                    - IIIF Content State; a longer link that can be viewed on
                    this site, or in any IIIF viewer.
                  </li>
                </ul>
              </li>
            </ul>
          </span>
        </li>
        <li className="flex flex-row gap-2 ml-4">
          <input
            type="checkbox"
            onClick={() => {
              setSpecifyCanvas(!specifyCanvas);
            }}
          />
          Include current canvas {specifyCanvas.toString()}
          {canvasURI && <div>{canvasURI}</div>}
        </li>
        <li className="flex flex-row gap-2 ml-4">
          <input
            type="checkbox"
            onClick={() => {
              setSpecifyRegion(!specifyRegion);
            }}
          />
          Include current zoom region {specifyRegion.toString()}
          {zoomRegion && (
            <span>
              {zoomRegion?.x},{zoomRegion?.y},{zoomRegion?.width},
              {zoomRegion?.height}
            </span>
          )}
        </li>
        <li className="bg-gray-100 p-3 flex flex-col">
          <CopyToClipboard
            href={stateSharingLink}
            copiedText="Copied!"
            target="_blank"
            className="pointer"
            rel="noreferrer"
          >
            <div className="flex flex-row gap-2">
              <CopyToClipboardIcon />
              <span>Short link for use on this site (copy to clipboard)</span>
            </div>
          </CopyToClipboard>
          <div className="min-h-12 flex flex-wrap border border-black p-2 break-all">
            {customSharingLink}
          </div>
        </li>
        <li className="bg-gray-100 p-3 flex flex-col">
          <CopyToClipboard
            href={stateSharingLink}
            copiedText="Copied!"
            target="_blank"
            className="pointer"
            rel="noreferrer"
          >
            <div className="flex flex-row gap-2">
              <CopyToClipboardIcon />
              <span>IIIF Content State (copy to clipboard)</span>
            </div>
          </CopyToClipboard>
          <div className="min-h-12 flex flex-wrap border border-black p-2 break-all">
            {stateSharingLink}
          </div>
        </li>
      </ul>
    </div>
  );
}
