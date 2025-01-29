import { getClassName } from "@/helpers/exhibition";
import { Canvas } from "@iiif/presentation-3";
import { TextualContentStrategy } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { AutoLanguage } from "../pages/AutoLanguage";
import { Suspense } from "react";
import { ReadMoreBlock } from "./ReadMore";
import { useLocale } from "next-intl";
import { getValue } from "@iiif/helpers";

interface InfoBlockProps {
  canvas: Canvas;
  strategy: TextualContentStrategy;
  id: number;
}

export function InfoBlock({ id, canvas, strategy }: InfoBlockProps) {
  const className = getClassName(canvas.behavior);
  const locale = useLocale();
  const items =
    strategy.items.length === 1 ? strategy.items : strategy.items.filter((t) => Object.keys(t.text).includes(locale));

  return (
    <>
      <div className={twMerge("cut-corners bg-black p-6 text-white", className)}>
        <div className="exhibition-info-block">
          {items.map((item, idx) => (
            <AutoLanguage key={idx} lines html className="mb-3">
              {item.text}
            </AutoLanguage>
          ))}
          <p>
            {/* TODO: reintroduce translations */}
            <Suspense fallback={<div className="underline underline-offset-4">Read more</div>}>
              <ReadMoreBlock content={{ readMore: "Read more" }} canvasId={canvas.id} />
            </Suspense>
          </p>
        </div>
      </div>
    </>
  );
}
