import type { Canvas } from "@iiif/presentation-3";
import { Suspense } from "react";
import type { TextualContentStrategy } from "react-iiif-vault";
import { LocaleString, useIIIFLanguage } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { getClassName } from "../helpers/exhibition";
import { getItemsByLocale } from "../helpers/get-items-by-locale";
import { BaseGridSection } from "./BaseGridSection";
import ReadMoreBlock from './ReadMore';

export interface InfoBlockProps {
  canvas: Canvas;
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

  return (
    <BaseGridSection
      enabled={scrollEnabled}
      updatesTitle={!!canvas.label}
      id={id || `${index}`}
      className={twMerge("cut-corners bg-black p-6 text-white", className)}
    >
      <div className="exhibition-info-block">
        {items.map((item, idx) => (
          <LocaleString
            key={idx}
            enableDangerouslySetInnerHTML
            className="mb-3"
          >
            {item.text}
          </LocaleString>
        ))}

        <Suspense
          fallback={
            <div className="underline underline-offset-4">
              <LocaleString>Read more</LocaleString>
            </div>
          }
        >
          <ReadMoreBlock canvasId={canvas.id} />
        </Suspense>
      </div>
    </BaseGridSection>
  );
}
