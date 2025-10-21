import { useSimpleViewer, useVault, useManifest } from "react-iiif-vault";
import type { Manifest } from "@iiif/presentation-3";
import {
  getValue,
  rangesToTableOfContentsTree,
  type RangeTableOfContentsNode,
} from "@iiif/helpers";

type RangeNavigationProps = {
  manifest: Manifest;
};
export function RangeNavigation({ manifest }: RangeNavigationProps) {
  const context = useSimpleViewer();
  const { setCurrentCanvasId } = context;
  const vault = useVault();
  const mani = useManifest();
  const ranges = mani?.structures?.filter((struct) => struct.type === "Range");
  const toc = rangesToTableOfContentsTree(vault, ranges);

  return (
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
                    rel="noreferrer"
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
