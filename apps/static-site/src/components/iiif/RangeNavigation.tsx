import { useMemo, useState } from "react";
import {
  useSimpleViewer,
  useVault,
  useManifest,
  useVaultSelector,
} from "react-iiif-vault";
import {
  getValue,
  rangesToTableOfContentsTree,
  type RangeTableOfContentsNode,
} from "@iiif/helpers";
import type { SharingAndViewingLinksContent } from "./SharingAndViewingLinks";
import { TreeRangeItem } from "./TreeRangeItem";
import { Collection, Tree, type Key } from "react-aria-components";

export function RangeNavigation({
  content,
}: {
  content: SharingAndViewingLinksContent;
}) {
  const context = useSimpleViewer();
  const { setCurrentCanvasId } = context;
  const vault = useVault();
  const mani = useManifest();
  const structures = mani?.structures ?? [];
  const toc = useMemo(
    () => rangesToTableOfContentsTree(vault, structures),
    [structures],
  );
  const maxNodeSize = 500; // @todo config?

  function flattenedRanges(range: RangeTableOfContentsNode) {
    const flatList: {
      item: RangeTableOfContentsNode;
      parent: RangeTableOfContentsNode | null;
    }[] = [];
    flatList.push({ item: range, parent: null });
    for (const item of range.items || []) {
      flatList.push({ item, parent: range });
      if (item.type === "Range") {
        flatList.push(...flattenedRanges(item));
      }
    }
    return flatList;
  }

  function RenderItem({
    item,
    parent,
  }: {
    item: RangeTableOfContentsNode;
    parent?: RangeTableOfContentsNode;
  }) {
    if (item.type === "Canvas") {
      return null;
    }
    return (
      <TreeRangeItem
        range={item}
        hasChildItems={!!item.items}
        parentId={parent?.id}
        onClick={() => {
          item.firstCanvas?.source?.id &&
            setCurrentCanvasId(item.firstCanvas?.source?.id);
          setTimeout(() => {
            scrollToTitle();
          }, 300);
        }}
      >
        <Collection items={item.items || []}>
          {(t) => <RenderItem item={t} parent={item} />}
        </Collection>
      </TreeRangeItem>
    );
  }

  const { flatItems } = useVaultSelector((_, vault) => {
    const range = rangesToTableOfContentsTree(vault, structures)! || {};
    const flatItems = flattenedRanges(range);
    return { structures, range, flatItems };
  });

  const expandAllKeys = useMemo<Key[]>(
    () =>
      flatItems
        .filter(({ item }) => item.type === "Range" && item.items?.length)
        .filter(({ item }) => (item.items?.length || 0) < maxNodeSize)
        .map(({ item }) => item.id as Key),
    [flatItems],
  );

  const [expandedKeys, setExpandedKeys] = useState<Iterable<Key>>([]);

  function scrollToTitle() {
    const el = document.querySelector(".atlas-container");
    el?.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "start",
    });
  }

  return !toc?.items ? null : (
    <div className="overflow-hidden font-mono">
      <div className="cut-corners w-full place-self-start bg-black p-5 text-white">
        <h3 className="uppercase">{getValue(toc?.label)}</h3>
        <div className="mb-3">
          <button
            onClick={() => setExpandedKeys(expandAllKeys)}
            className="mt-4 uppercase hover:text-slate-300 hover:underline"
          >
            expand all +
          </button>
          {" | "}
          <button
            onClick={() => setExpandedKeys([])}
            className="mt-4 uppercase hover:text-slate-300 hover:underline"
          >
            collapse all -
          </button>
        </div>
        <Tree
          aria-label={getValue(toc?.label)}
          items={toc.items}
          expandedKeys={expandedKeys}
          onExpandedChange={setExpandedKeys}
          selectionMode="single"
        >
          {function renderItem(item) {
            return <RenderItem item={item} />;
          }}
        </Tree>
      </div>
    </div>
  );
}
