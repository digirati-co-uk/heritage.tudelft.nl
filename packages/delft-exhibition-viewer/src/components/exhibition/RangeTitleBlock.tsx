import { BaseGridSection } from "@/components/shared/BaseGridSection";
import type { TableOfContentsItem } from "@/helpers/range-navigation";
import { LocaleString } from "react-iiif-vault";

export function RangeTitleBlock({
  items,
  isFirstRangeTitle = false,
  scrollEnabled = true,
}: {
  items: TableOfContentsItem[];
  isFirstRangeTitle?: boolean;
  scrollEnabled?: boolean;
}) {
  if (!items.length) return null;
  const titleItems = items.filter((item) => item.depth === 0);
  const anchorItems = items.filter((item) => item.depth > 0);

  if (!titleItems.length) {
    return <RangeTargetAnchors items={items} className="col-span-12" />;
  }

  const blockTargetId = titleItems[0].targetId;

  return (
    <>
      <BaseGridSection
        id={blockTargetId}
        enabled={scrollEnabled}
        className={`col-span-12 w-full pr-5 pb-6 text-black ${isFirstRangeTitle ? "pt-0" : "pt-12"}`}
        style={{ scrollMarginTop: 0 }}
      >
        <div className="flex flex-col gap-4">
          {titleItems.map((item) => (
            <h2
              key={item.id}
              id={item.targetId === blockTargetId ? undefined : item.targetId}
              className="text-4xl font-normal"
              style={{ scrollMarginTop: 0 }}
            >
              <LocaleString>{item.label}</LocaleString>
            </h2>
          ))}
        </div>
      </BaseGridSection>
      <RangeTargetAnchors items={anchorItems} className="col-span-12" />
    </>
  );
}

function RangeTargetAnchors({ items, className = "" }: { items: TableOfContentsItem[]; className?: string }) {
  if (!items.length) return null;

  return (
    <div aria-hidden="true" className={`h-0 overflow-hidden ${className}`} style={{ scrollMarginTop: 0 }}>
      {items.map((item) => (
        <span key={item.targetId} id={item.targetId} className="block h-0" style={{ scrollMarginTop: 0 }} />
      ))}
    </div>
  );
}
