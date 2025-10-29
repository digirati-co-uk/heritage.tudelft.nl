import type { Canvas } from "@iiif/presentation-3";
import { Suspense } from "react";
import type { TextualContentStrategy } from "react-iiif-vault";
import { LocaleString, useIIIFLanguage, useVault } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { getClassName } from "../helpers/exhibition";
import { getItemsByLocale } from "../helpers/get-items-by-locale";
import { BaseGridSection } from "./BaseGridSection";
import ReadMoreBlock from "./ReadMore";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";

export interface InfoBlockProps {
  canvas: CanvasNormalized;
  strategy: TextualContentStrategy;
  firstInfo?: boolean;
  locale: string;
  id?: string;
  scrollEnabled?: boolean;
  index: number;
}

export function InfoBlock({
  id,
  index,
  canvas,
  strategy,
  firstInfo,
  scrollEnabled,
}: InfoBlockProps) {
  const className = getClassName(canvas.behavior, firstInfo);
  const locale = useIIIFLanguage();
  const items = getItemsByLocale(strategy.items, locale);
  const vault = useVault();
  const annotationPage = vault.get(canvas.annotations || []);
  const annotations = vault.get(
    annotationPage.flatMap((page) => page?.items || []),
  );

  return (
    <BaseGridSection
      enabled={scrollEnabled}
      updatesTitle={!!canvas.label}
      id={id || `${index}`}
      className={twMerge(
        "cut-corners bg-InfoBlock p-6 text-InfoBlockText",
        className,
      )}
    >
      <div className="exhibition-info-block">
        {canvas.label ? (
          <div className="text-m mb-4 font-mono delft-title">
            <LocaleString>{canvas.label}</LocaleString>
          </div>
        ) : (
          ""
        )}
        {items.map((item, idx) => (
          <LocaleString
            key={idx}
            enableDangerouslySetInnerHTML
            className="mb-3"
          >
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
            {/* @todo pass on the annotations to component */}
            <ReadMoreBlock canvasId={canvas.id} />
          </Suspense>
        ) : (
          ""
        )}
      </div>
    </BaseGridSection>
  );
}
