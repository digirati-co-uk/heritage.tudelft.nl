import { Manifest } from "@iiif/presentation-3";
import { getValue } from "@iiif/helpers";

export async function BottomBar({ manifest }: { manifest: Manifest }) {
  const title = getValue(manifest.label);

  return (
    <div className="flex flex-row bg-slate-400">
      <div>{title}</div>
    </div>
  );
}
