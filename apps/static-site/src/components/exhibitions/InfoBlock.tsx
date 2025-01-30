import { getClassName } from "@/helpers/exhibition";
import type { Canvas } from "@iiif/presentation-3";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import type { TextualContentStrategy } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { AutoLanguage } from "../pages/AutoLanguage";
import { useLocale } from "next-intl";
import { getValue } from "@iiif/helpers";

const ReadMoreBlock = dynamic(() => import("./ReadMore"));

interface InfoBlockProps {
  canvas: Canvas;
  strategy: TextualContentStrategy;
  id: number;
  locale: string;
}

function getItemsByLocale<T extends { text: any }>(items: T[], locale: string): T[] {
  if (items.length === 1) return items;
  const found = items.filter((t) => Object.keys(t.text).includes(locale));
  if (found.length) {
    return found;
  }
  const firstLang = Object.keys(items[0]?.text || {})[0];
  if (firstLang) {
    return items.filter((t) => Object.keys(t.text).includes(firstLang));
  }
  return items;
}

export function InfoBlock({ id, canvas, strategy, locale }: InfoBlockProps) {
  const className = getClassName(canvas.behavior);
  const items = getItemsByLocale(strategy.items, locale);

  return (
    <div className={twMerge("cut-corners bg-black p-6 text-white", className)}>
      <div className="exhibition-info-block">
        {items.map((item, idx) => (
          <AutoLanguage key={idx} lines html className="mb-3">
            {item.text}
          </AutoLanguage>
        ))}
        <Suspense fallback={<div className="underline underline-offset-4">"Read more"</div>}>
          <ReadMoreBlock content={{ readMore: "Read more" }} canvasId={canvas.id} />
        </Suspense>
      </div>
    </div>
  );
}
