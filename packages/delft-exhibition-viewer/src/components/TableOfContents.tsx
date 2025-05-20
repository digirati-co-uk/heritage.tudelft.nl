import type { InternationalString } from "@iiif/presentation-3";
import { LocaleString, useManifest } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { useHashValue } from "../helpers/use-hash-value";
import { IIIFIcon } from "./icons/IIIFIcon";

export function TableOfContents({
  items,
  treeLabel,
}: {
  treeLabel?: InternationalString | null;
  items: { label?: InternationalString | null }[];
}) {
  const manifest = useManifest();
  const [hash] = useHashValue();
  const hashAsNumber = hash ? Number.parseInt(hash, 10) : null;

  return (
    <>
      <div className="mb-3 flex flex-col gap-4">
        <div className="flex">
          <LocaleString className="text-2xl uppercase mb-4 flex-1">
            {manifest?.label}
          </LocaleString>

          <a
            href={`${manifest?.id}?manifest=${manifest?.id}`}
            target="_blank"
            className=""
            title="Drag and Drop IIIF Resource"
            rel="noreferrer"
          >
            <IIIFIcon
              className="text-xl opacity-50 hover:opacity-100"
              title={"Open IIIF Manifest"}
            />
            <span className="sr-only">Open IIIF Manifest</span>
          </a>
        </div>
        {treeLabel ? (
          <LocaleString className="text-lg">{treeLabel}</LocaleString>
        ) : null}
      </div>
      <ol className="list-decimal flex flex-col gap-2 font-mono">
        {items.map((item, idx) => {
          if (!item.label) return null;
          return (
            <li key={`toc_entry_${idx}`} className="marker:text-white/40">
              <LocaleString
                as="a"
                className={twMerge(
                  "text-md hover:underline",
                  hashAsNumber === idx ? "underline" : "",
                )}
                href={`#s${idx}`}
              >
                {item.label}
              </LocaleString>
            </li>
          );
        })}
      </ol>
    </>
  );
}
