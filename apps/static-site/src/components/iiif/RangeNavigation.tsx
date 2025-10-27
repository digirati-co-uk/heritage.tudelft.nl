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
import { Collection, Tree, type Key } from "react-aria-components";
import { TreeRangeItem } from "./TreeRangeItem";
import { encodeContentState } from "@iiif/helpers";

export function RangeNavigation({
  content,
  onNavigate,
}: {
  content: SharingAndViewingLinksContent;
  onNavigate?: (uri: string) => void;
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
  const maxNodeSize = 500; // @todo config?

  // This is a temporary function to encode the chosen canvas with a zoom region in to content state
  // That encoded state is used for testing the ability to decode and reflect that state
  function stateCreateAndEncode(uri: string) {
    const state = {
      "@context": "http://iiif.io/api/presentation/3/context.json",
      id: "https://example.org/import/1",
      type: "Annotation",
      motivation: ["contentState"],
      target: {
        id: `${uri}#xywh=100,200,100,200`,
        type: "Canvas",
        partOf: [
          {
            id: mani?.id,
            type: "Manifest",
          },
        ],
      },
    };
    const stateStr = JSON.stringify(state);
    const encoded = encodeContentState(stateStr);
    console.log("encoded state", encoded);
    return encoded;
  }

  function updateURIState(uri: string) {
    const urlSp = new URLSearchParams();
    console.log("setting uri state", uri);
    urlSp.set("state", uri);
  }

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
          const encoded = stateCreateAndEncode(item.firstCanvas?.source?.id);
          //updateURIState(encoded);
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

  const [expandedKeys, setExpandedKeys] =
    useState<Iterable<Key>>(expandAllKeys);

  function scrollToTitle() {
    const el = document.querySelector("main");
    el?.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "start",
    });
  }

  const dispItems = tocExpanded ? toc?.items : toc?.items?.slice(0, 2);

  return !dispItems ? null : (
    <div className="overflow-hidden font-mono">
      <div className="cut-corners w-full place-self-start bg-black p-5 text-white">
        <h3 className="mb-4 uppercase">{getValue(toc?.label)}</h3>
        <Tree
          aria-label={getValue(toc?.label)}
          items={dispItems}
          expandedKeys={expandedKeys}
          onExpandedChange={setExpandedKeys}
          selectionMode="single"
        >
          {function renderItem(item) {
            return <RenderItem item={item} />;
          }}
        </Tree>

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
