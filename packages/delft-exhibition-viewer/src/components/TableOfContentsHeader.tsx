import type { InternationalString } from "@iiif/presentation-3";
import { LocaleString } from "react-iiif-vault";

export function TableOfContentsHeader({
  label,
  content,
}: {
  label: InternationalString;
  content: { exhibition: string };
}) {
  return (
    <div
      className={"col-span-12 w-full px-5 pb-8 text-black scroll-m-9"}
      id="top"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-row justify-between">
          <div className="text-xl uppercase">{content.exhibition}</div>
        </div>
        <div className="flex flex-row justify-between">
          <h2 className="text-4xl font-light">
            <LocaleString>{label}</LocaleString>
          </h2>
        </div>
      </div>
    </div>
  );
}
