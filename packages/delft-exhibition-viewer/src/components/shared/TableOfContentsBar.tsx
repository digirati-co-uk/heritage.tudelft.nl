import { Dialog } from "@headlessui/react";
import { createRangeHelper } from "@iiif/helpers";
import type { InternationalString } from "@iiif/presentation-3";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePress } from "react-aria";
import { LocaleString, useManifest, useVault, useVaultSelector } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import {
  createTableOfContentsItems,
  findCurrentTableOfContentsItem,
  type TableOfContentsItem,
} from "../../helpers/range-navigation";
import { getCanvasNavigationId } from "../../helpers/canvas-navigation";
import { useHashValue } from "../../helpers/use-hash-value";
import { ContentsIcon } from "../icons/ContentsIcon";
import { TableOfContents } from "./TableOfContents";

function findCurrentItemFromScrollPosition(items: TableOfContentsItem[]) {
  if (typeof window === "undefined") return null;

  let currentItem: TableOfContentsItem | null = null;
  let nextItem: { item: TableOfContentsItem; top: number } | null = null;

  for (const [index, item] of items.entries()) {
    const nextCanvasIndex = items.slice(index + 1).find((candidate) => candidate.canvasIndex !== undefined)?.canvasIndex;
    const lastFallbackCanvasIndex =
      item.canvasIndex === undefined
        ? undefined
        : nextCanvasIndex === undefined || nextCanvasIndex <= item.canvasIndex
          ? item.canvasIndex
          : nextCanvasIndex - 1;
    let element = document.getElementById(item.targetId);
    if (!element && item.canvasIndex !== undefined && lastFallbackCanvasIndex !== undefined) {
      for (let canvasIndex = item.canvasIndex; canvasIndex <= lastFallbackCanvasIndex; canvasIndex++) {
        element = document.getElementById(getCanvasNavigationId(canvasIndex));
        if (element) break;
      }
    }
    if (!element) continue;

    const top = element.getBoundingClientRect().top;
    if (top <= 40) {
      currentItem = item;
      continue;
    }

    if (!nextItem || top < nextItem.top) {
      nextItem = { item, top };
    }
  }

  return currentItem || nextItem?.item || null;
}

export function TableOfContentsBar({
  initialOpen = false,
  hideInitial = false,
  hideTable = false,
  fixed = false,
  content,
  onPlay,
  children,
  enabledCanvasId,
  showManifestDetails = true,
}: {
  hideInitial?: boolean;
  initialOpen?: boolean;
  fixed?: boolean;
  hideTable?: boolean;
  content: { tableOfContents: string | InternationalString };
  onPlay?: () => void;
  children?: React.ReactNode;
  enabledCanvasId?: string;
  showManifestDetails?: boolean;
}) {
  const [hash] = useHashValue(() => {
    // custom on change.
    setTocOpen(false);
  });
  const manifest = useManifest();
  const vault = useVault();
  const rangeHelper = useMemo(() => createRangeHelper(vault), [vault]);
  const range = useVaultSelector((s, vault) => vault.get((manifest?.structures || [])[0]));
  const canvases = useVaultSelector((s, vault) => vault.get(manifest?.items || []));
  const tree = useMemo(() => rangeHelper.rangeToTableOfContentsTree(range), [range, rangeHelper]);
  const items = useMemo(() => createTableOfContentsItems(tree, canvases), [tree, canvases]);

  const hashCurrentItem = findCurrentTableOfContentsItem(items, hash);
  const [scrollCurrentItem, setScrollCurrentItem] = useState<TableOfContentsItem | null>(null);

  const refreshScrollCurrentItem = useCallback(() => {
    setScrollCurrentItem(findCurrentItemFromScrollPosition(items));
  }, [items]);

  useEffect(() => {
    if (!items.length || typeof window === "undefined") {
      setScrollCurrentItem(null);
      return;
    }

    let frame: number | null = null;
    const scheduleRefresh = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        refreshScrollCurrentItem();
      });
    };

    scheduleRefresh();
    window.addEventListener("scroll", scheduleRefresh, { passive: true });
    window.addEventListener("resize", scheduleRefresh);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleRefresh);
      window.removeEventListener("resize", scheduleRefresh);
    };
  }, [items, refreshScrollCurrentItem]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const frame = window.requestAnimationFrame(refreshScrollCurrentItem);
    return () => window.cancelAnimationFrame(frame);
  }, [hash, refreshScrollCurrentItem]);

  const currentItem = scrollCurrentItem || hashCurrentItem;

  const [isTocOpen, setTocOpen] = useState(initialOpen);

  const toggleProps = usePress({
    onPress: () => {
      if (!isTocOpen) refreshScrollCurrentItem();
      setTocOpen((isOpen) => !isOpen);
    },
  });

  return (
    <div className="relative">
      {!fixed && isTocOpen ? (
        <div className="delft-toc-contents absolute bottom-0 z-30 mb-14 px-14 py-4 text-TextPrimary overflow-y-auto bg-ControlBar left-0 right-0">
          <TableOfContents
            items={items}
            content={content}
            currentItem={currentItem}
            treeLabel={tree?.label}
            enabledCanvasId={enabledCanvasId}
            showManifestDetails={showManifestDetails}
          />
        </div>
      ) : null}

      <div
        className={twMerge(
          "delft-toc-bar z-30 h-14 flex items-center flex-col justify-center bg-ControlBar",
          "transition-opacity drop-shadow-lg px-4",

          fixed && "fixed bottom-0 left-0 right-0 px-4 lg:px-9",

          currentItem || !hideInitial ? "pointer-events-auto opacity-1" : "pointer-events-none opacity-0",
        )}
      >
        <div className="relative z-30 w-full max-w-screen-xl px-5 lg:px-10">
          <div className="flex flex-row items-center justify-between gap-2 text-lg font-medium text-TextPrimary sm:text-2xl font-mono">
            <div className="my-2 font-light flex-1 min-w-0">
              <button
                className="z-50 uppercase text-TextPrimary overflow-ellipsis overflow-hidden whitespace-nowrap max-w-full"
                aria-label={`${isTocOpen ? "Hide" : "Show"} table of contents`}
                {...toggleProps.pressProps}
              >
                {currentItem?.label ? (
                  <LocaleString>{currentItem?.label}</LocaleString>
                ) : (
                  <LocaleString>{content.tableOfContents}</LocaleString>
                )}
              </button>
            </div>
            <div className="flex flex-row items-center gap-2 text-3xl flex-shrink-0">
              {hideTable ? null : (
                <button
                  className="z-50 hover:bg-black/10 w-10 h-10 rounded flex items-center justify-center"
                  {...toggleProps.pressProps}
                  aria-label={`${isTocOpen ? "Hide" : "Show"} table of contents`}
                >
                  <ContentsIcon />
                </button>
              )}

              {/* Additional controls. */}
              {children}
            </div>
          </div>
        </div>
      </div>

      {fixed ? (
        <Dialog
          className={twMerge(
            "exhibition-viewer exhibition-viewer-toc",
            fixed ? "exhibition-viewer-toc--fixed" : "exhibition-viewer-toc--absolute",
            "transition-all duration-300 ease-in-out transform origin-bottom",
            isTocOpen ? "exhibition-viewer-toc--open" : "exhibition-viewer-toc--closed",
          )}
          open={isTocOpen}
          onClose={() => setTocOpen(false)}
        >
          <Dialog.Panel className="delft-toc-contents z-40 flex w-full max-w-screen-xl flex-col px-10 py-6 text-TextPrimary overflow-y-auto">
            <TableOfContents
              treeLabel={tree?.label}
              items={items}
              content={content}
              currentItem={currentItem}
              enabledCanvasId={enabledCanvasId}
              showManifestDetails={showManifestDetails}
            />
          </Dialog.Panel>
        </Dialog>
      ) : null}
    </div>
  );
}
