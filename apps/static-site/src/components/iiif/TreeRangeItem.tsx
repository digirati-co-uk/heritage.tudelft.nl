import { getValue, type RangeTableOfContentsNode } from "@iiif/helpers";

// import { PlusIcon } from "@manifest-editor/ui/icons/PlusIcon";
// import { ResizeHandleIcon } from "@manifest-editor/ui/icons/ResizeHandleIcon";
import { useCallback } from "react";
import type {
  TreeItemContentRenderProps,
  TreeItemProps,
} from "react-aria-components";
import {
  Button,
  Checkbox,
  Dialog,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  TreeItem,
  TreeItemContent,
} from "react-aria-components";
import { LocaleString, useVault } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
// import { ChevronDownIcon } from "./ChevronDownIcon";
// import { useRangeTreeOptions } from "./RangeTree";

interface TreeRangeItemProps extends Partial<TreeItemProps> {
  range: RangeTableOfContentsNode;
  parentId?: string;
}

export function TreeRangeItem(props: TreeRangeItemProps) {
  //const { back } = useEditingStack();
  const vault = useVault();
  //const isActive = props.range.id === range?.resource.source?.id;
  //const activeId = range?.resource.source?.id;
  const isNoNav = props.range.isNoNav;

  const items = props.range.items ?? [];
  const hasChildRanges = items.some((i) => i.type === "Range");
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
          isDropTarget,
          selectionMode,
        }: TreeItemContentRenderProps) => (
          <>
            {selectionBehavior === "toggle" && selectionMode !== "none" && (
              <Checkbox slot="selection" />
            )}

            {hasVisibleChildren ? (
              <Button slot="chevron">
                {/* <ChevronDownIcon
                  className={twMerge("text-xl")}
                  style={{
                    transition: "transform .2s",
                    transform: `rotate(${isExpanded ? "0deg" : "-90deg"})`,
                  }}
                /> */}
                {isExpanded ? <>-</> : <>+</>}
              </Button>
            ) : (
              <span
                slot="chevron"
                aria-hidden
                tabIndex={-1}
                className="pointer-events-none"
              >
                {/* <ChevronDownIcon
                  className={twMerge(
                    "text-xl",
                    "opacity-20 cursor-not-allowed",
                  )}
                  style={{
                    transition: "transform .2s",
                    transform: `rotate(${isExpanded ? "0deg" : "-90deg"})`,
                  }}
                /> */}
                <>-</>
              </span>
            )}

            <div
              className={twMerge(
                "flex items-center gap-2 border-b border-gray-200 flex-1 min-w-0",
                isDropTarget && "bg-me-primary-100/50",
                !showCanvases &&
                  props.range.isRangeLeaf &&
                  "border-transparent",
                //isActive && "border-transparent",
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
