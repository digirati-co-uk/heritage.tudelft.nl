import { useMemo, useState } from "react";
import { useSimpleViewer, useVault, useManifest } from "react-iiif-vault";
import {
  getValue,
  rangesToTableOfContentsTree,
  type RangeTableOfContentsNode,
} from "@iiif/helpers";
import type { SharingAndViewingLinksContent } from "./SharingAndViewingLinks";

export function RangeNavigation({
  content,
}: {
  content: SharingAndViewingLinksContent;
}) {
  const [tocExpanded, setTocExpanded] = useState<boolean>(true);
  const context = useSimpleViewer();
  const { setCurrentCanvasId } = context;
  const vault = useVault();
  const mani = useManifest();
  const structures = mani?.structures ?? [];
  const toc = useMemo(
    () => rangesToTableOfContentsTree(vault, structures),
    [structures],
  );

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

  const dispItems = tocExpanded ? toc?.items : toc?.items?.slice(0, 2);

  return tocEmpty ? null : (
    <div className="overflow-hidden font-mono">
      <div className="cut-corners w-full place-self-start bg-black p-5 text-white">
        <h3 className="mb-4 uppercase">{getValue(toc?.label)}</h3>
        {dispItems?.map((range: RangeTableOfContentsNode) => {
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

        {toc?.items?.length && toc?.items?.length > 2 && (
          <button
            onClick={() => setTocExpanded(!tocExpanded)}
            className="mt-4 uppercase hover:text-slate-300 hover:underline"
          >
            {tocExpanded ? `${content.showLess} -` : `${content.showMore} +`}
          </button>
        )}
      </div>
    </div>
  );
}
