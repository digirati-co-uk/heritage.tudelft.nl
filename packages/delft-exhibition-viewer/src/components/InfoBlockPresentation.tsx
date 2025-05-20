import { LocaleString, useIIIFLanguage } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { getItemsByLocale } from "../helpers/get-items-by-locale";
import { BaseSlide, type BaseSlideProps } from "./BaseSlide";
import type { InfoBlockProps } from "./InfoBlock";
import InfoBlockContents from "./InfoBlockContents";

export function InfoBlockPresentation({
  canvas,
  index,
  strategy,
  active,
}: InfoBlockProps & BaseSlideProps) {
  const locale = useIIIFLanguage();
  const items = getItemsByLocale(strategy.items, locale);
  return (
    <BaseSlide
      className={"bg-white flex items-center px-8 pb-8"}
      index={index}
      active={active}
    >
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
              <LocaleString
                key={idx}
                enableDangerouslySetInnerHTML
                className="mb-3"
              >
                {item.text}
              </LocaleString>
            ))}
          </>
        }
      />
    </BaseSlide>
  );
}
