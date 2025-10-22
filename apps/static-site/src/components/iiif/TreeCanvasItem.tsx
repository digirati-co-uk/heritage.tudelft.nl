import { getValue, type RangeTableOfContentsNode } from "@iiif/helpers";
import { useState } from "react";
import type {
  TreeItemContentRenderProps,
  TreeItemProps,
} from "react-aria-components";
import { Checkbox, TreeItem, TreeItemContent } from "react-aria-components";
import { LocaleString, useCanvas } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { TreeIndent } from "./TreeRangeItem";

interface TreeCanvasItemProps extends Partial<TreeItemProps> {
  rangeItem: RangeTableOfContentsNode;
  parent?: RangeTableOfContentsNode;
  onClick?: () => void;
}

export function TreeCanvasItem(props: TreeCanvasItemProps) {
  const canvas = useCanvas();
  const [isActive, setIsActive] = useState(false);

  if (!canvas) {
    return null;
  }

  const id = props?.parent?.resource
    ? `${props.parent.resource.id}$__$${props.rangeItem.id}`
    : props.rangeItem.id;

  const thisLeaf = document.getElementById(`leaf_${props.rangeItem.id}`);
  const treeItem = thisLeaf?.closest(".react-aria-TreeItem");
  const treeItemLevel = treeItem?.getAttribute("data-level");
  const treeItemLevelNum = treeItemLevel ? Number.parseInt(treeItemLevel) : 0;

  return (
    <TreeItem
      className={twMerge(
        "react-aria-TreeItem relative hover:bg-gray-700 flex items-center gap-2 overflow-x-clip px-1.5",
        isActive && "pt-8 react-aria-TreeItem-active",
      )}
      textValue={getValue(canvas.label)}
      id={id}
      {...props}
      value={props.rangeItem}
    >
      <TreeItemContent>
        {({ selectionBehavior, selectionMode }: TreeItemContentRenderProps) => (
          <>
            <TreeIndent level={treeItemLevelNum} />
            <div id={`leaf_${props.rangeItem.id}`}>
              {selectionBehavior === "toggle" && selectionMode !== "none" && (
                <Checkbox slot="selection" />
              )}
              <button
                onClick={props.onClick}
                className={twMerge(
                  `flex flex-1 min-w-0 truncate whitespace-nowrap items-center gap-2 flex-shrink-0`,
                  isActive && "pl-4",
                )}
              >
                <LocaleString className="ml-4">{canvas.label}</LocaleString>
              </button>
            </div>
          </>
        )}
      </TreeItemContent>
      {props.children}
    </TreeItem>
  );
}
