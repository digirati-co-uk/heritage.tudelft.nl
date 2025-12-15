import type { InfoBlockProps } from "@/components/exhibition/InfoBlock";
import { BaseSlide, type BaseSlideProps } from "@/components/shared/BaseSlide";
import { useExhibitionStep } from "@/helpers/exhibition-store";
import { LocaleString, useIIIFLanguage } from "react-iiif-vault";
import { getItemsByLocale } from "../../helpers/get-items-by-locale";
import InfoBlockContents from "../shared/InfoBlockContents";

export function InfoBlockPresentation({ canvas, index, strategy }: InfoBlockProps & BaseSlideProps) {
  const locale = useIIIFLanguage();
  const items = getItemsByLocale(strategy.items, locale);
  const step = useExhibitionStep();
  const active = step?.canvasId === canvas.id;

  return (
    <BaseSlide className={"bg-white flex items-center px-8 pb-8"} index={index} active={active}>
      <InfoBlockContents
        canvasId={canvas.id}
        fallback={
          <>
            {canvas.label ? (
              <div className="text-m mb-4 font-mono delft-title">
                <LocaleString>{canvas.label}</LocaleString>
              </div>
            ) : (
              ""
            )}
            {items.map((item, idx) => (
              <LocaleString key={idx} enableDangerouslySetInnerHTML className="mb-3">
                {item.text}
              </LocaleString>
            ))}
          </>
        }
      />
    </BaseSlide>
  );
}
