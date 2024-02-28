import invariant from "tiny-invariant";
import { AutoLanguage } from "../pages/AutoLanguage";
import { Manifest } from "@iiif/presentation-3";

export function TitlePanel({ manifest }: { manifest: Manifest }) {
  invariant(manifest, "Manifest not found");

  return (
    <div className="cut-corners col-span-4 row-span-4 flex min-h-[400px] flex-col justify-between bg-yellow-400 p-5">
      <div className="text-md text-center font-mono uppercase">Exhibition</div>
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-center text-3xl font-bold">
          <AutoLanguage>{manifest.label}</AutoLanguage>
        </h1>
        <div className="github-link-wrapper">
          <a className="font-mono text-xs underline underline-offset-4" href="#">
            View source on GitHub
          </a>
        </div>
        <div className="iiif-link-wrapper">
          <a href={`${manifest.id}?manifest=${manifest.id}`} target="_blank" title="Drag and Drop IIIF Resource"></a>
        </div>
      </div>
      {/* This strange div is a spacer.. */}
      <div />
    </div>
  );
}
