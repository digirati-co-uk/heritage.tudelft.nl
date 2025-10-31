import { Dialog } from "@headlessui/react";
import { CloseIcon } from "../icons/CloseIcon";
import { SharingOptions } from "./SharingOptions";
import { ZoomRegion } from "@/helpers/content-state";
import { InternationalString } from "@iiif/presentation-3";

export function SharingOptionsDialog({
  manifestId,
  canvasURI,
  canvasSeqIdx,
  canvasLabel,
  zoomRegion,
  sharingOptionsOpen,
  setSharingOptionsOpen,
}: {
  manifestId: string;
  canvasURI?: string;
  canvasSeqIdx: number;
  canvasLabel: InternationalString | null | undefined;
  zoomRegion?: ZoomRegion | null;
  sharingOptionsOpen: boolean;
  setSharingOptionsOpen: (open: boolean) => void;
}) {
  return (
    <Dialog
      className="relative z-50"
      open={sharingOptionsOpen}
      onClose={() => setSharingOptionsOpen(false)}
    >
      <div className="fixed inset-0 bg-black/30 flex flex-row" />
      <div className="w-[90vw] h-[90vh] xl:w-[80vw] md:h-[60vh] fixed inset-0 justify-self-center p-4">
        <button
          className="absolute right-8 top-8 z-20 flex h-12 w-12 items-center justify-center rounded"
          onClick={() => setSharingOptionsOpen(false)}
        >
          <CloseIcon />
        </button>
        <Dialog.Panel className="relative flex h-full w-full flex-col justify-center overflow-y-auto overflow-x-hidden rounded bg-white">
          <div className="min-h-0 flex-1 p-4 mt-2">
            <SharingOptions
              manifestId={manifestId}
              initCanvasURI={canvasURI}
              initCanvasSeqIdx={canvasSeqIdx}
              initCanvasLabel={canvasLabel}
              initZoomRegion={zoomRegion}
              //onChange={(changed) => console.log(changed)}
            />
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
