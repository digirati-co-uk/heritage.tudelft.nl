import { useSimpleViewer, useVault, useManifest } from "react-iiif-vault";
import type { Manifest } from "@iiif/presentation-3";
import {
  getValue,
  rangesToTableOfContentsTree,
  type RangeTableOfContentsNode,
} from "@iiif/helpers";

export function RangeNavigation() {
  const context = useSimpleViewer();
  const { setCurrentCanvasId } = context;
  const vault = useVault();
  const mani = useManifest();
  const structures = mani?.structures ?? [];
  const toc = rangesToTableOfContentsTree(vault, structures);

  // find at least one valid entry
  let tocEmpty = true;
  if (toc?.items && toc.items.length > 0) {
    for (const range of toc?.items) {
      if (range.items && range.items.length > 0) {
        for (const item of range.items) {
          if (item.id && getValue(range.label)) {
            tocEmpty = false;
            break;
          }
        }
      }
      if (!tocEmpty) break;
    }
  }

  return tocEmpty ? null : (
    <div className="overflow-hidden font-mono">
      <div className="cut-corners w-full place-self-start bg-black p-5 text-white">
        <h3 className="mb-4 uppercase">Table of Contents</h3>
        {toc?.items?.map((range: RangeTableOfContentsNode) => {
          return (
            <div key={range?.id}>
              {range.items?.map((item: RangeTableOfContentsNode) => {
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentCanvasId(item.id)}
                    className="underline hover:text-slate-300"
                  >
                    {getValue(range.label)}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
