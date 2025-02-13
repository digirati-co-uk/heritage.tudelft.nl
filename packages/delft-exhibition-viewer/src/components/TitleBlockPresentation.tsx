import type { Manifest } from "@iiif/presentation-3";
import { LocaleString } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { BaseSlide, type BaseSlideProps } from "./BaseSlide";

export function TitleBlockPresentation({
  manifest,
  ...props
}: { manifest: Manifest } & BaseSlideProps) {
  return (
    <BaseSlide
      className={
        "bg-TitleCard text-TitleCardText items-center flex flex-col justify-center"
      }
      {...props}
    >
      <div className="flex flex-col items-center gap-4">
        <h1 className="my-3 text-center text-4xl font-medium">
          <LocaleString>{manifest.label}</LocaleString>
        </h1>
        <div className="iiif-link-wrapper">
          <a
            href={`${manifest.id}?manifest=${manifest.id}`}
            target="_blank"
            className=""
            title="Drag and Drop IIIF Resource"
            rel="noreferrer"
          >
            <span className="sr-only">Open IIIF Manifest</span>
          </a>
        </div>
      </div>
    </BaseSlide>
  );
}
