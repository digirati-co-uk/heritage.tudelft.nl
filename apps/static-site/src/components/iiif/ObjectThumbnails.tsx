import { SequenceThumbnails, useSimpleViewer } from "react-iiif-vault";

export function ObjectThumbnails() {
  const { sequence } = useSimpleViewer();

  if (sequence.length < 2) {
    return null;
  }

  return (
    <SequenceThumbnails
      size={{ width: 256, height: 256 }}
      classes={{
        // Row
        container: "flex gap-1 overflow-x-auto bg-[#373737] p-2 h-[178px] overflow-hidden",
        row: "flex gap-2 border border-gray-700 flex-none cursor-pointer hover:bg-gray-700",
        img: "h-[128px] w-[128px] object-cover h-full w-full align-middle block",
        imageWrapper: "flex",
        item: "flex p-2",
        selected: {
          row: "flex gap-2 border border-blue-400 flex-none",
        },
      }}
      fallback={
        <div className="flex h-32 w-32 select-none items-center justify-center bg-gray-200 text-gray-400">No thumb</div>
      }
    />
  );
}
