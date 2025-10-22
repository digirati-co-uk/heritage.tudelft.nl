import { getValue, type RangeTableOfContentsNode } from "@iiif/helpers";
import type {
  TreeItemContentRenderProps,
  TreeItemProps,
} from "react-aria-components";
import {
  Button,
  Checkbox,
  TreeItem,
  TreeItemContent,
} from "react-aria-components";
import { LocaleString, useVault } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";

interface TreeRangeItemProps extends Partial<TreeItemProps> {
  range: RangeTableOfContentsNode;
  parentId?: string;
}

export function TreeRangeItem(props: TreeRangeItemProps) {
  const vault = useVault();
  const isNoNav = props.range.isNoNav;
  const items = props.range.items ?? [];
  //const hasChildRanges = items.some((i) => i.type === "Range");
  const hasChildRanges = items.some((i) => i.isRangeLeaf);
  const hasCanvases = items.some((i) => i.type === "Canvas");
  const isEditing = false;
  const showCanvases = true;
  const hasVisibleChildren = hasChildRanges || (showCanvases && hasCanvases);

  return (
    <TreeItem
      className={twMerge(
        "react-aria-TreeItem hover:bg-gray-700 flex items-center gap-2 p-1.5",
        isNoNav ? "opacity-40" : "",
      )}
      textValue={getValue(props.range.label)}
      id={props.range.id}
      {...props}
    >
      <TreeItemContent>
        {({
          isExpanded,
          selectionBehavior,
          selectionMode,
        }: TreeItemContentRenderProps) => (
          <>
            {selectionBehavior === "toggle" && selectionMode !== "none" && (
              <Checkbox slot="selection" />
            )}

            {hasVisibleChildren ? (
              <Button slot="chevron">{isExpanded ? <>-</> : <>+</>}</Button>
            ) : (
              <span
                slot="chevron"
                aria-hidden
                tabIndex={-1}
                className="pointer-events-none"
              >
                <span>&nbsp;</span>
              </span>
            )}

            <div
              className={twMerge(
                "flex items-center gap-2 border-b border-gray-200 flex-1 min-w-0",
                !showCanvases &&
                  props.range.isRangeLeaf &&
                  "border-transparent",
              )}
            >
              <LocaleString className="truncate whitespace-nowrap flex-1 min-w-0">
                {props.range.label || "Untitled range"}
              </LocaleString>

              {!isEditing && !showCanvases && props.range.isRangeLeaf ? (
                <div className="text-right bg-gray-200 py-0.5 px-2 text-xs rounded-full text-black/80">
                  {props.range.items?.length}
                </div>
              ) : null}
            </div>
          </>
        )}
      </TreeItemContent>
      {props.children}
    </TreeItem>
  );
}
