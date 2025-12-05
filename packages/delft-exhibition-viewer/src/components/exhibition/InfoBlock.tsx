import { BaseGridSection } from "@/components/shared/BaseGridSection";
import { ReadMoreBlock } from "@/components/shared/ReadMore";
import { getClassName } from "@/helpers/exhibition";
import { getItemsByLocale } from "@/helpers/get-items-by-locale";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { Suspense } from "react";
import type { TextualContentStrategy } from "react-iiif-vault";
import { LocaleString, useIIIFLanguage, useVault } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { Hookable } from "../EditorHooks";

export interface InfoBlockProps {
  canvas: CanvasNormalized;
  strategy: TextualContentStrategy;
  firstInfo?: boolean;
  id?: string;
  scrollEnabled?: boolean;
  index: number;
}

export function InfoBlock({ id, index, canvas, strategy, firstInfo, scrollEnabled }: InfoBlockProps) {
  const className = getClassName(canvas.behavior, firstInfo);
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
      className={twMerge("cut-corners bg-InfoBlock p-6 text-InfoBlockText", className)}
    >
      <div className="exhibition-info-block">
        {canvas.label ? (
          <div className="text-m mb-4 font-mono delft-title">
            <Hookable type="localeStringEditor" property="label" resource={canvas}>
              <LocaleString>{canvas.label}</LocaleString>
            </Hookable>
          </div>
        ) : (
          ""
        )}
        {items.map((item, idx) => (
          <LocaleString key={idx} enableDangerouslySetInnerHTML className="mb-3">
            {item.text}
          </LocaleString>
        ))}

        {annotations.length ? (
          <Suspense
            fallback={
              <div className="underline underline-offset-4">
                <LocaleString>Read more</LocaleString>
              </div>
            }
          >
            <ReadMoreBlock />
          </Suspense>
        ) : (
          ""
        )}
      </div>
    </BaseGridSection>
  );
}
