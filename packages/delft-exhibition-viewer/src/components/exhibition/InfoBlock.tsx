import { BaseGridSection } from "@/components/shared/BaseGridSection";
import { ReadMoreBlock } from "@/components/shared/ReadMore";
import { getClassName } from "@/helpers/exhibition";
import { getItemsByLocale } from "@/helpers/get-items-by-locale";
import { hasSelectedText, isInteractiveElement } from "@/helpers/text-block-interaction";
import { useInfoBlockContents } from "@/hooks/use-info-box-contents";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { type MouseEvent, Suspense, useState } from "react";
import type { TextualContentStrategy } from "react-iiif-vault";
import { LocaleString, useIIIFLanguage } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { Hookable } from "../EditorHooks";

export interface InfoBlockProps {
  canvas: CanvasNormalized;
  strategy: TextualContentStrategy;
  firstInfo?: boolean;
  id?: string;
  scrollEnabled?: boolean;
  index: number;
  content?: {
    readMore?: string;
  };
}

export function InfoBlock({ id, index, canvas, strategy, firstInfo, scrollEnabled, content }: InfoBlockProps) {
  const className = getClassName(canvas.behavior, firstInfo);
  const locale = useIIIFLanguage();
  const items = getItemsByLocale(strategy.items, locale);
  const readMoreLabel = content?.readMore || "Read more";
  const readMoreContents = useInfoBlockContents();
  const hasReadMoreContent = readMoreContents.length > 0;
  const [isReadMoreOpen, setIsReadMoreOpen] = useState(false);

  const openReadMoreFromBlock = (event: MouseEvent<HTMLElement>) => {
    if (!hasReadMoreContent || event.defaultPrevented || isInteractiveElement(event.target) || hasSelectedText()) {
      return;
    }

    setIsReadMoreOpen(true);
  };

  return (
    <BaseGridSection
      enabled={scrollEnabled}
      updatesTitle={!!canvas.label}
      id={id || `${index}`}
      className={twMerge(
        "cut-corners bg-InfoBlock p-6 text-InfoBlockText",
        hasReadMoreContent && "exhibition-summary-click-target cursor-pointer transition-colors duration-150 hover:bg-[#242424]",
        className,
      )}
      onClick={openReadMoreFromBlock}
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

        {hasReadMoreContent ? (
          <Suspense
            fallback={
              <div className="underline underline-offset-4">
                <LocaleString>{readMoreLabel}</LocaleString>
              </div>
            }
          >
            <ReadMoreBlock
              label={readMoreLabel}
              isOpen={isReadMoreOpen}
              onOpenChange={setIsReadMoreOpen}
            />
          </Suspense>
        ) : (
          ""
        )}
      </div>
    </BaseGridSection>
  );
}
