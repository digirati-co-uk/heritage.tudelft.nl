import { encodeContentState } from "@iiif/helpers";
import Link from "next/link";

export type ZoomRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function parseXywh(xywh: string | null | undefined) {
  if (!xywh) return undefined;
  const regex = /\d+,\d+,\d+,\d+$/;
  if (regex.test(xywh)) {
    const arr = xywh.split(",");
    const numArr: number[] = arr.map((n) => Number.parseInt(n));
    return {
      x: numArr[0],
      y: numArr[1],
      width: numArr[2],
      height: numArr[3],
    };
  }
  return undefined;
}

export function updateStateSharingLink({
  manifestId,
  canvasURI,
  zoomRegion,
}: {
  manifestId: string;
  canvasURI: string | undefined;
  zoomRegion: ZoomRegion | null | undefined;
}) {
  return canvasURI
    ? stateCreateAndEncode({
        manifestId: manifestId,
        canvasURI: canvasURI,
        zoomRegion: zoomRegion,
      })
    : manifestId;
}

export function updateCustomSharingLink({
  pathname,
  manifestId,
  canvasSeqIdx = 0,
  zoomRegion,
}: {
  pathname: string;
  manifestId: string;
  canvasSeqIdx: number;
  zoomRegion: ZoomRegion | null | undefined;
}) {
  const canvasPart = canvasSeqIdx ? `?id=${canvasSeqIdx}` : "";
  const regionPart = zoomRegion ? `xywh=${serialiseRegion(zoomRegion)}` : "";
  const sep = canvasSeqIdx && zoomRegion ? "&" : zoomRegion ? "?" : "";
  const relativeUrl = `${pathname}${canvasPart}${sep}${regionPart}`;
  return `https://heritage.tudelft.nl${relativeUrl}`;
}

function serialiseRegion(zoomRegion: ZoomRegion | null | undefined) {
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
  zoomRegion: ZoomRegion | null | undefined;
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
  return encoded;
}
