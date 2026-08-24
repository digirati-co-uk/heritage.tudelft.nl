import { BaseGridSection } from "@/components/shared/BaseGridSection";
import type { TableOfContentsItem } from "@/helpers/range-navigation";
import { LocaleString } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";

export function RangeTitleBlock({ items, scrollEnabled = true }: { items: TableOfContentsItem[]; scrollEnabled?: boolean }) {
  if (!items.length) return null;
  const blockTargetId = items[0].targetId;

  return (
    <BaseGridSection
      id={blockTargetId}
      enabled={scrollEnabled}
      className="col-span-12 w-full px-5 pb-8 pt-12 text-black"
      style={{ scrollMarginTop: 0 }}
    >
      <div className="flex flex-col gap-4">
        {items.map((item) =>
          item.depth === 0 ? (
            <h2
              key={item.id}
              id={item.targetId === blockTargetId ? undefined : item.targetId}
              className="text-4xl font-light"
              style={{ scrollMarginTop: 0 }}
            >
              <LocaleString>{item.label}</LocaleString>
            </h2>
          ) : (
            <h3
              key={item.id}
              id={item.targetId === blockTargetId ? undefined : item.targetId}
              style={{ scrollMarginTop: 0 }}
              className={twMerge(
                "font-mono delft-title text-xl font-normal tracking-normal opacity-70",
                item.depth > 1 && "pl-6",
              )}
            >
              <LocaleString>{item.label}</LocaleString>
            </h3>
          ),
        )}
      </div>
    </BaseGridSection>
  );
}
