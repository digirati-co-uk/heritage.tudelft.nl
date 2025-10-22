import { getValue, type RangeTableOfContentsNode } from "@iiif/helpers";

import type {
  TreeItemContentRenderProps,
  TreeItemProps,
} from "react-aria-components";
import { Button, TreeItem, TreeItemContent } from "react-aria-components";
import { LocaleString, useVault } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";

export function TreeIndent({ level }: { level: number }) {
  const arr: any[] = [];
  for (let i = 0; i < level; i++) {
    arr.push("");
  }
  return arr.map(() => {
    return <span>&nbsp;</span>;
  });
}

interface TreeRangeItemProps extends Partial<TreeItemProps> {
  range: RangeTableOfContentsNode;
  parentId?: string;
}

export function TreeRangeItem(props: TreeRangeItemProps) {
  const isNoNav = props.range.isNoNav;
  const items = props.range.items ?? [];
  const hasChildRanges = items.some((i) => i.type === "Range");
  const hasVisibleChildren = hasChildRanges;

  const thisLeaf = document.getElementById(`leaf_${props.range.id}`);
  const treeItem = thisLeaf?.closest(".react-aria-TreeItem");
  const treeItemLevel = treeItem?.getAttribute("data-level");
  const treeItemLevelNum = treeItemLevel ? Number.parseInt(treeItemLevel) : 0;

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
        {({ isExpanded }: TreeItemContentRenderProps) => (
          <>
            <TreeIndent level={treeItemLevelNum} />
            <div id={`leaf_${props.range.id}`}>
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
            </div>

            <div
              className={twMerge(
                "flex items-center gap-2 border-b border-gray-200 flex-1 min-w-0",
                props.range.isRangeLeaf && "border-transparent",
              )}
            >
              <LocaleString className="truncate whitespace-nowrap flex-1 min-w-0">
                {props.range.label || "Untitled range"}
              </LocaleString>
            </div>
          </>
        )}
      </TreeItemContent>
      {props.children}
    </TreeItem>
  );
}
