import { AutoLanguage } from "../pages/AutoLanguage";
import { encodeContentState } from "@iiif/helpers";
import { Checkbox } from "../atoms/Checkbox";
import { useState } from "react";

export type ZoomRegion = {
  x: number;
  y: number;
  width?: number;
  height?: number;
};

function updateSharingLink({
  manifestId,
  canvasURI,
  zoomRegion,
}: {
  manifestId: string;
  canvasURI: string | undefined;
  zoomRegion: ZoomRegion | undefined;
}) {
  return canvasURI
    ? stateCreateAndEncode({
        manifestId: manifestId,
        canvasURI: canvasURI,
        zoomRegion: zoomRegion,
      })
    : manifestId;
}

function serialiseRegion(zoomRegion: ZoomRegion | undefined) {
  if (zoomRegion?.width && zoomRegion?.height) {
    return `#xywh=${zoomRegion.x},${zoomRegion.y},${zoomRegion.width},${zoomRegion.height}`;
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
      id: `${canvasURI}${serialiseRegion(zoomRegion)}`,
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
  console.log("encoded state", encoded);
  return encoded;
}

export function SharingOptions({
  manifestId,
  initCanvasURI,
  initZoomRegion,
}: {
  manifestId: string;
  initCanvasURI?: string;
  initZoomRegion?: ZoomRegion;
}) {
  const [canvasURI, setCanvasURI] = useState<string>(initCanvasURI ?? "");
  const [zoomRegion, setZoomRegion] = useState<ZoomRegion | undefined>(
    initZoomRegion,
  );
  const [sharingLink, setSharingLink] = useState<string>(manifestId);
  const [specifyCanvas, setSpecifyCanvas] = useState<boolean>(false);
  const [specifyRegion, setSpecifyRegion] = useState<boolean>(false);

  console.log(initCanvasURI, initZoomRegion);

  return (
    <div>
      <ul className="flex flex-col gap-3">
        <li>
          <h3>
            <AutoLanguage>Sharing Link</AutoLanguage>
          </h3>
        </li>
        <li className="bg-gray-100 p-2 border border-black">
          <div className="min-h-12 flex flex-wrap">{sharingLink}</div>
        </li>
        <li className="flex flex-row gap-2">
          <input
            type="checkbox"
            onClick={() => {
              setSpecifyCanvas(!specifyCanvas);
              setSharingLink(
                updateSharingLink({
                  manifestId: manifestId,
                  canvasURI: specifyCanvas ? canvasURI : "",
                  zoomRegion: specifyRegion ? zoomRegion : undefined,
                }),
              );
            }}
          />
          Include link to current canvas {specifyCanvas.toString()}
          {canvasURI && <div>{canvasURI}</div>}
        </li>
        <li className="flex flex-row gap-2">
          <input
            type="checkbox"
            onClick={() => {
              setSpecifyRegion(!specifyRegion);
              setSharingLink(
                updateSharingLink({
                  manifestId: manifestId,
                  canvasURI: specifyCanvas ? canvasURI : "",
                  zoomRegion: specifyRegion ? zoomRegion : undefined,
                }),
              );
            }}
          />
          Include link to current zoom region {specifyRegion.toString()}
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
