import { AutoLanguage } from "../pages/AutoLanguage";
import { encodeContentState } from "@iiif/helpers";
import { Checkbox } from "../atoms/Checkbox";
import { useState, useEffect } from "react";
import { CopyToClipboard } from "../atoms/CopyToClipboard";
import { CopyToClipboardIcon } from "../atoms/CopyToClipboardIcon";

export type ZoomRegion = {
  x: number;
  y: number;
  width?: number;
  height?: number;
};

function updateStateSharingLink({
  manifestId,
  canvasURI,
  zoomRegion,
}: {
  manifestId: string;
  canvasURI: string | undefined;
  zoomRegion: ZoomRegion | undefined;
}) {
  console.log(canvasURI, zoomRegion);
  return canvasURI
    ? stateCreateAndEncode({
        manifestId: manifestId,
        canvasURI: canvasURI,
        zoomRegion: zoomRegion,
      })
    : manifestId;
}

function updateCustomSharingLink({
  manifestId,
  canvasSeqIdx = 0,
  zoomRegion,
}: {
  manifestId: string;
  canvasSeqIdx: number;
  zoomRegion: ZoomRegion | undefined;
}) {
  const canvasPart = canvasSeqIdx ? `?id=${canvasSeqIdx}` : "";
  const regionPart = zoomRegion ? `xywh=${serialiseRegion(zoomRegion)}` : "";
  const sep = canvasSeqIdx && zoomRegion ? "&" : zoomRegion ? "?" : "";
  return `${manifestId}${canvasPart}${sep}${regionPart}`;
}

function serialiseRegion(zoomRegion: ZoomRegion | undefined) {
  if (zoomRegion?.width && zoomRegion?.height) {
    return `${zoomRegion.x},${zoomRegion.y},${zoomRegion.width},${zoomRegion.height}`;
  }
  return "";
}

function stateCreateAndEncode({
  manifestId,
  canvasURI,
  zoomRegion,
}: {
  manifestId: string;
  canvasURI: string | undefined;
  zoomRegion: ZoomRegion | undefined;
}) {
  const state = {
    "@context": "http://iiif.io/api/presentation/3/context.json",
    id: "https://example.org/import/1",
    type: "Annotation",
    motivation: ["contentState"],
    target: {
      id: `${canvasURI}#xywh=${serialiseRegion(zoomRegion)}`,
      type: "Canvas",
      partOf: [
        {
          id: manifestId,
          type: "Manifest",
        },
      ],
    },
  };
  const stateStr = JSON.stringify(state);
  const encoded = encodeContentState(stateStr);
  const stateLink = `${manifestId}?iiif-content=${encoded}`;
  console.log(stateLink);
  return stateLink;
}

export function SharingOptions({
  manifestId,
  initCanvasURI,
  initCanvasSeqIdx = 0,
  initZoomRegion,
}: {
  manifestId: string;
  initCanvasURI?: string;
  initCanvasSeqIdx?: number;
  initZoomRegion?: ZoomRegion;
}) {
  const [canvasURI, setCanvasURI] = useState<string>(initCanvasURI ?? ""); // setters for future if we allow canvas and region reselection in the Sharing Options dialog.
  const [zoomRegion, setZoomRegion] = useState<ZoomRegion | undefined>(
    initZoomRegion,
  );
  const [stateSharingLink, setStateSharingLink] = useState<string>(manifestId);
  const [customSharingLink, setCustomSharingLink] =
    useState<string>(manifestId);
  const [specifyCanvas, setSpecifyCanvas] = useState<boolean>(false);
  const [specifyRegion, setSpecifyRegion] = useState<boolean>(false);

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
        <li>
          <h3>
            <AutoLanguage>Sharing Link</AutoLanguage>
          </h3>
        </li>
        <li className="bg-gray-100 p-2 flex flex-col">
          <CopyToClipboard
            href={stateSharingLink}
            copiedText="Copied!"
            target="_blank"
            className="pointer"
          >
            <div className="flex flex-row gap-2">
              <CopyToClipboardIcon />
              <span>IIIF Content State</span>
            </div>
          </CopyToClipboard>
          <div className="min-h-12 flex flex-wrap border border-black p-2 break-all">
            {stateSharingLink}
          </div>
        </li>
        <li className="bg-gray-100 p-2 flex flex-col">
          <CopyToClipboard
            href={stateSharingLink}
            copiedText="Copied!"
            target="_blank"
            className="pointer"
          >
            <div className="flex flex-row gap-2">
              <CopyToClipboardIcon />
              <span>id and region parameters</span>
            </div>
          </CopyToClipboard>
          <div className="min-h-12 flex flex-wrap border border-black p-2 break-all">
            {customSharingLink}
          </div>
        </li>
        <li className="flex flex-row gap-2">
          <input
            type="checkbox"
            onClick={() => {
              setSpecifyCanvas(!specifyCanvas);
            }}
          />
          Include current canvas {specifyCanvas.toString()}
          {canvasURI && <div>{canvasURI}</div>}
        </li>
        <li className="flex flex-row gap-2">
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
      </ul>
    </div>
  );
}
