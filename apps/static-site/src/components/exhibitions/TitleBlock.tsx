import invariant from "tiny-invariant";
import { AutoLanguage } from "../pages/AutoLanguage";
import { Manifest } from "@iiif/presentation-3";
import { getTranslations } from "next-intl/server";
import { UpIcon } from "../atoms/UpIcon";
import { DownIcon } from "../atoms/DownIcon";

export async function TitlePanel({ manifest, position }: { manifest: Manifest; position: number }) {
  const t = await getTranslations();
  invariant(manifest, "Manifest not found");
  return (
    manifest.items[position]?.label &&
    (position === 0 ? (
      <div className="col-span-12 w-full px-5 pb-8 text-black" id={position.toString()}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-row justify-between">
            <div className="text-xl uppercase">{t("Exhibition")}</div>
            <div className="text-xl uppercase">{t("Table of contents")}</div>
          </div>
          <div className="flex flex-row justify-between">
            <h1 className="text-4xl font-medium">
              <AutoLanguage>{manifest.label}</AutoLanguage>
            </h1>
            <div>
              <a href={`#${position + 1}`}>
                <DownIcon />
              </a>
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="col-span-12 w-full px-5 pb-8 pt-8 text-black" id={position.toString()}>
        <div className="flex flex-row justify-between">
          <h2 className="text-4xl font-light">
            <AutoLanguage>{manifest.items[position]?.label}</AutoLanguage>
          </h2>
          <div className="flex flex-row">
            <a href={`#${position - 1}`}>
              <UpIcon />
            </a>
            {position < manifest.items.length - 1 && (
              <a href={`#${position + 1}`}>
                {" "}
                <DownIcon />
              </a>
            )}
          </div>
        </div>
      </div>
    ))
  );

  return (
    <div className="cut-corners col-span-4 row-span-4 flex min-h-[400px] flex-col justify-between bg-yellow-400 p-5">
      <div className="text-md text-center font-mono uppercase">{t("Exhibition")}</div>
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-center text-3xl font-medium">
          <AutoLanguage>{manifest.label}</AutoLanguage>
        </h1>
        <div className="iiif-link-wrapper">
          <a href={`${manifest.id}?manifest=${manifest.id}`} target="_blank" title="Drag and Drop IIIF Resource"></a>
        </div>
      </div>
      {/* This strange div is a spacer.. */}
      <div />
    </div>
  );
}
