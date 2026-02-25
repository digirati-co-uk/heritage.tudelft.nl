import {
  CanvasPanel,
  CombinedMetadata,
  SequenceThumbnails,
} from "react-iiif-vault";
import { JsonPanel } from "./JsonPanel";
import { ResourceSummaryCard } from "./ResourceSummaryCard";
import type { ResourceResponse } from "./types";

export function ManifestResourcePage({
  data,
  thumb,
}: {
  data: ResourceResponse;
  thumb: string | null;
}) {
  return (
    <main className="overflow-hidden">
      <style>{`div.atlas-container {
        height: 65vh;
        min-width: 0;
        min-height: 0;
        --atlas-container-flex: 1 1 0px;
        --atlas-background: #373737;
        --atlas-container-height: 100%;
      }`}</style>

      <CanvasPanel manifest={data.resource}>
        <SequenceThumbnails
          classes={{
            // Grid
            // container: 'grid grid-cols-1 gap-2 overflow-y-auto min-h-0 h-full',
            // row: 'flex gap-2 border border-gray-200 flex-none p-2 m-2',
            // selected: {
            //   row: 'flex gap-2 border border-blue-400 flex-none p-2 m-2 bg-blue-100',
            // },
            // Row
            container:
              "flex w-full flex-row gap-2 flex-nowrap overflow-x-auto items-end p-2 bg-gray-50 ring-b ring-gray-200",
            row: "flex flex-row gap-0.5 bg-black min-w-32 items-center justify-center shrink-0 gap-1 ring ring-gray-200 rounded overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow",
            img: "h-[120px] w-auto object-contain block min-w-0 min-h-0",
            selected: {
              row: "flex flex-row gap-1 min-w-32 ring-4 shrink-0 items-center justify-center ring-blue-400 rounded overflow-hidden bg-blue-50 shadow-md",
            },
          }}
          fallback={
            <div className="flex items-center justify-center w-20 h-[120px] bg-gray-100 text-gray-400 select-none text-xs text-center px-1">
              No thumb
            </div>
          }
        />
        <CombinedMetadata
          allowHtml={true}
          classes={{
            container: "m-4",
            row: "border-b border-gray-200",
            label: "font-bold p-2 text-slate-600",
            value: "text-sm p-2 text-slate-800",
            empty: "text-gray-400",
          }}
        />
      </CanvasPanel>

      <ResourceSummaryCard data={data} thumb={thumb} />
      <section>
        <JsonPanel title="IIIF Resource" value={data.resource} />
        <JsonPanel title="meta.json" value={data.meta} />
        <JsonPanel title="indices.json" value={data.indices} />
      </section>
    </main>
  );
}
