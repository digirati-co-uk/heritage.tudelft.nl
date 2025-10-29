import { getClassName } from "@/helpers/exhibition";
import { LocaleString, useCanvas } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { BaseGridSection } from "../shared/BaseGridSection";

interface BaseExhibitionBlockProps {
  id?: string;
  index: number;
  scrollEnabled?: boolean;
  children: React.ReactNode;
}

export function BaseExhibitionBlock(props: BaseExhibitionBlockProps) {
  const { id, index, scrollEnabled, children } = props;
  const canvas = useCanvas();
  const behavior = canvas?.behavior || [];
  const isLeft = behavior.includes("left");
  const isRight = behavior.includes("right");
  const isBottom = behavior.includes("bottom");
  const isTop = behavior.includes("top");
  const isCover =
    behavior.includes("image-cover") || behavior.includes("cover");
  const showSummary = Boolean(
    canvas?.summary && (isLeft || isRight || isBottom || isTop),
  );
  const className = getClassName(behavior);

  if (!canvas) return null;

  return (
    <BaseGridSection
      id={id || `${index}`}
      enabled={scrollEnabled}
      className={twMerge(
        className,
        "cut-corners relative",
        !showSummary && "aspect-square lg:aspect-auto",
      )}
      data-info-top={isTop}
      data-info-right={isRight}
      data-info-bottom={isBottom}
      data-info-left={isLeft}
    >
      {showSummary ? (
        <div
          className={twMerge(
            "h-full md:flex",
            isLeft && "flex-row-reverse",
            isBottom && "flex-col",
            isTop && "flex-col-reverse",
          )}
        >
          <div
            className={twMerge(
              "cut-corners flex-1 md:w-2/3",
              (isBottom || isTop) && "w-full md:w-full",
              "aspect-square md:aspect-auto",
            )}
          >
            {children}
          </div>
          <div
            className={twMerge(
              "cut-corners flex flex-col bg-InfoBlock text-InfoBlockText p-5 md:w-1/3",
              (isBottom || isTop) && "w-full md:w-full",
            )}
          >
            <div
              className={twMerge(
                (isBottom || isRight) && "mb-4",
                isLeft && "place-self-end md:rotate-180",
                isTop && "order-3 place-self-start md:rotate-180 mt-4",
              )}
            >
              <svg
                className={twMerge(
                  isBottom || isTop ? "rotate-90" : "rotate-90 md:rotate-0",
                )}
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                <title>arrow</title>
                <path
                  d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div className="text-m mb-4 font-mono delft-title">
              <LocaleString>{canvas.label}</LocaleString>
            </div>
            <div className="exhibition-info-block">
              <div>
                <LocaleString
                  enableDangerouslySetInnerHTML
                  className="whitespace-pre-wrap"
                >
                  {canvas.summary}
                </LocaleString>
              </div>
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </BaseGridSection>
  );
}
