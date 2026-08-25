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
      className={"col-span-12 w-full pr-5 pb-9 text-black scroll-m-9"}
      id="top"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-medium leading-tight">
          <LocaleString>{label}</LocaleString>
        </h1>
        {/*
        <div className="font-mono delft-title text-xl font-normal tracking-normal opacity-70">
          {content.exhibition}
        </div>
        */}
      </div>
    </div>
  );
}
