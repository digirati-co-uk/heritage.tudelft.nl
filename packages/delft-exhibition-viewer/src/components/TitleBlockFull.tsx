import type { Manifest } from "@iiif/presentation-3";
import invariant from "tiny-invariant";
import { LocaleString } from "react-iiif-vault";

export function TitleBlockFull({ manifest }: { manifest: Manifest }) {
  invariant(manifest, "Manifest not found");

  return (
    <section className="cut-corners bg-TitleCard text-TitleCardText col-span-4 row-span-4 flex flex-col justify-between p-5">
      <div className="text-md text-center font-mono uppercase">{<LocaleString>Exhibition</LocaleString>}</div>
      <div className="flex items-center gap-4">
        <h1 className="my-3 text-center text-3xl font-medium">
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
      {/* This strange div is a spacer.. */}
      <div />
    </section>
  );
}
