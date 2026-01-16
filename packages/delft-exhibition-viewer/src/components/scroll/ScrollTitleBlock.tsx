import { BaseGridSection } from "@/components/shared/BaseGridSection";
import { TableOfContents } from "@/components/shared/TableOfContents";
import type { Manifest } from "@iiif/presentation-3";
import type { ManifestNormalized } from "@iiif/presentation-3-normalized";
import { LocaleString } from "react-iiif-vault";

export interface ScrollTitleBlockProps {
  manifest: Manifest | ManifestNormalized;
  index?: number;
  showTableOfContents?: boolean;
}

export function ScrollTitleBlock({ manifest, index = 0, showTableOfContents }: ScrollTitleBlockProps) {
  const items = (manifest.items || []).map((item) => ({ label: item.label }));

  return (
    <BaseGridSection
      enabled
      updatesTitle={false}
      id={`${index}`}
      className="bg-black text-white border-b border-white/10 py-16 sm:py-20"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 sm:px-10">
        <div className="flex flex-col gap-6">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">Exhibition</p>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            <LocaleString>{manifest.label}</LocaleString>
          </h1>
          {manifest.summary ? (
            <div className="text-lg leading-relaxed text-white/75">
              <LocaleString>{manifest.summary}</LocaleString>
            </div>
          ) : null}
          {manifest.requiredStatement ? (
            <div className="text-sm text-white/60">
              <span className="font-semibold text-white">
                <LocaleString>{manifest.requiredStatement.label}</LocaleString>
              </span>{" "}
              <LocaleString>{manifest.requiredStatement.value}</LocaleString>
            </div>
          ) : null}
        </div>

        {showTableOfContents ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <TableOfContents items={items} treeLabel={manifest.summary || manifest.label} />
          </div>
        ) : null}
      </div>
    </BaseGridSection>
  );
}
