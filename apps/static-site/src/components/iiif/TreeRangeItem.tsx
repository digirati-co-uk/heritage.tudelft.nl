import { getValue, type RangeTableOfContentsNode } from "@iiif/helpers";

import type {
  TreeItemContentRenderProps,
  TreeItemProps,
} from "react-aria-components";
import { Button, TreeItem, TreeItemContent } from "react-aria-components";
import { LocaleString, useVault } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";

interface TreeRangeItemProps extends Partial<TreeItemProps> {
  range: RangeTableOfContentsNode;
  parentId?: string;
}

export function TreeRangeItem(props: TreeRangeItemProps) {
  const items = props.range.items ?? [];
  const hasChildRanges = items.some((i) => i.type === "Range");
  const hasVisibleChildren = hasChildRanges;

  return (
    <TreeItem
      className="react-aria-TreeItem hover:bg-gray-700 flex items-center gap-2 p-1.5"
      textValue={getValue(props.range.label)}
      id={props.range.id}
      {...props}
    >
      <TreeItemContent>
        {({ isExpanded }: TreeItemContentRenderProps) => (
          <>
            {hasVisibleChildren && (
              <Button slot="chevron">{isExpanded ? <>-</> : <>+</>}</Button>
            )}

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
