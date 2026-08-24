import type { InternationalString } from "@iiif/presentation-3";
import { LocaleString, useManifest } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import {
  findCurrentTableOfContentsItem,
  getTableOfContentsItemHref,
  type TableOfContentsItem,
} from "@/helpers/range-navigation";
import { useHashValue } from "@/helpers/use-hash-value";
import { IIIFIcon } from "@/components/icons/IIIFIcon";

export function TableOfContents({
  items,
  content,
  currentItem: providedCurrentItem,
  enabledCanvasId,
  showManifestDetails = true,
}: {
  treeLabel?: InternationalString | null;
  items: TableOfContentsItem[];
  content: { tableOfContents: string | InternationalString };
  currentItem?: TableOfContentsItem | null;
  enabledCanvasId?: string;
  showManifestDetails?: boolean;
}) {
  const manifest = useManifest();
  const [hash] = useHashValue();
  const currentItem = providedCurrentItem || findCurrentTableOfContentsItem(items, hash);
  let topLevelIndex = 0;

  return (
    <>
      <div className="mb-2 flex flex-col">
        <div className="flex">
          {showManifestDetails ? (
            <LocaleString as="div" className="flex-1 font-mono text-lg uppercase">
              {content.tableOfContents}
            </LocaleString>
          ) : (
            <div className="flex-1" />
          )}

          <a
            href={`${manifest?.id}?manifest=${manifest?.id}`}
            target="_blank"
            className=""
            title="Drag and Drop IIIF Resource"
            rel="noreferrer"
          >
            <IIIFIcon
              className="text-xl opacity-50 hover:opacity-100"
              title={"Open IIIF Manifest"}
            />
            <span className="sr-only">Open IIIF Manifest</span>
          </a>
        </div>
      </div>
      <ol className="flex list-none flex-col gap-2 font-mono">
        {items.map((item, idx) => {
          if (!item.label) return null;
          const itemNumber = item.depth === 0 ? ++topLevelIndex : undefined;
          const disabled = Boolean(
            item.canvasIndex === undefined || (enabledCanvasId && item.canvasId && item.canvasId !== enabledCanvasId),
          );
          const active = currentItem?.id === item.id;
          const marker = item.depth ? "" : `${itemNumber}.`;
          const label = <LocaleString as="span">{item.label}</LocaleString>;
          return (
            <li
              key={item.id || `toc_entry_${idx}`}
              value={itemNumber}
              className={twMerge("grid grid-cols-[2rem_minmax(0,1fr)] items-baseline gap-3", disabled && "opacity-35")}
              style={item.depth ? { marginLeft: `${item.depth * 1.25}rem` } : undefined}
            >
              <span aria-hidden="true" className="text-left text-white/40">
                {marker}
              </span>
              {disabled ? (
                <span className={twMerge("text-md cursor-not-allowed underline-offset-4")} aria-disabled>
                  {label}
                </span>
              ) : (
                <a
                  className={twMerge(
                    "text-md w-fit leading-tight underline-offset-4 hover:underline",
                    active ? "font-bold underline" : "",
                  )}
                  href={getTableOfContentsItemHref(item)}
                  aria-current={active ? "location" : undefined}
                >
                  {label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
