import { BaseGridSection } from "@/components/shared/BaseGridSection";
import { TableOfContents } from "@/components/shared/TableOfContents";
import { type ScrollThemeOptions, useScrollTheme } from "@/theme/scroll-theme";
import type { Manifest } from "@iiif/presentation-3";
import type { ManifestNormalized } from "@iiif/presentation-3-normalized";
import { LocaleString, useVault } from "react-iiif-vault";

export interface ScrollTitleBlockProps {
  manifest: Manifest | ManifestNormalized;
  index?: number;
  showTableOfContents?: boolean;
  options?: ScrollThemeOptions;
}

export function ScrollTitleBlock({ manifest, index = 0, showTableOfContents }: ScrollTitleBlockProps) {
  const { titleBlock } = useScrollTheme();
  const vault = useVault();
  const items = (manifest.items || []).map((item) => ({ label: vault.get(item)?.label }));

  return (
    <BaseGridSection enabled updatesTitle={false} id={`${index}`} className={titleBlock.className}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 sm:px-10">
        <div className="flex flex-col gap-6">
          <p className="text-xs uppercase tracking-[0.4em] opacity-60">Exhibition</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">
            <LocaleString>{manifest.label}</LocaleString>
          </h1>
          {manifest.summary ? (
            <div className="text-lg leading-relaxed opacity-75">
              <LocaleString>{manifest.summary}</LocaleString>
            </div>
          ) : null}
          {manifest.requiredStatement ? (
            <div className="text-sm opacity-75">
              <div className="font-semibold">
                <LocaleString>{manifest.requiredStatement.label}</LocaleString>
              </div>
              <LocaleString>{manifest.requiredStatement.value}</LocaleString>
            </div>
          ) : null}
        </div>

        {/* This doesn't work great with the scrolling. Might need a different variation,
          maybe fixed position on desktop on the left or right */}
        {showTableOfContents ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <TableOfContents items={items} treeLabel={manifest.summary || manifest.label} />
          </div>
        ) : null}
      </div>
    </BaseGridSection>
  );
}
