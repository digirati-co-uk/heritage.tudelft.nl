import { BaseGridSection } from "@/components/shared/BaseGridSection";
import { InfoBlockContentsInner } from "@/components/shared/InfoBlockContents";
import { getItemsByLocale } from "@/helpers/get-items-by-locale";
import { useScrollTheme } from "@/theme/scroll-theme";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { Suspense } from "react";
import type { TextualContentStrategy } from "react-iiif-vault";
import { LocaleString, useIIIFLanguage, useVault } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";

export interface ScrollInfoBlockProps {
  canvas: CanvasNormalized;
  strategy: TextualContentStrategy;
  id?: string;
  scrollEnabled?: boolean;
  index: number;
}

export function ScrollInfoBlock({ id, index, canvas, strategy, scrollEnabled }: ScrollInfoBlockProps) {
  const { infoBlock } = useScrollTheme();
  const locale = useIIIFLanguage();
  const items = getItemsByLocale(strategy.items, locale);
  const vault = useVault();
  const annotationPage = vault.get(canvas.annotations || []);
  const annotations = vault.get(annotationPage.flatMap((page) => page?.items || []));

  return (
    <BaseGridSection
      enabled={scrollEnabled}
      updatesTitle={!!canvas.label}
      id={id || `${index}`}
      className={twMerge(infoBlock.className, "py-12 sm:py-16", "px-6 sm:px-10")}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 exhibition-info-scroll prose-headings:text-white">
        {canvas.label ? (
          <h2 className="text-2xl font-semibold sm:text-3xl">
            <LocaleString>{canvas.label}</LocaleString>
          </h2>
        ) : null}

        {annotations.length ? (
          <Suspense fallback={<div className="text-white/60">Read more</div>}>
            <InfoBlockContentsInner className={infoBlock.innerClassName} />
          </Suspense>
        ) : items.length ? (
          <div className="space-y-4 text-lg leading-relaxed">
            {items.map((item, idx) => (
              <LocaleString key={idx} enableDangerouslySetInnerHTML>
                {item.text}
              </LocaleString>
            ))}
          </div>
        ) : null}
      </div>
    </BaseGridSection>
  );
}
