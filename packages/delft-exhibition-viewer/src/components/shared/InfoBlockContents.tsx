import { useInfoBlockContents } from "@/hooks/use-info-box-contents";
import type { ReactNode } from "react";
import { CanvasContext } from "react-iiif-vault";
import { LocaleString } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";

export function InfoBlockContentsInner({ fallback, className }: { fallback?: ReactNode; className?: string }) {
  const annotationsToShow = useInfoBlockContents();

  return (
    <article className={twMerge("prose prose-lg h-fit max-w-2xl leading-snug md:leading-normal", className)}>
      {annotationsToShow.length === 0 ? fallback || null : null}
      {annotationsToShow.map(({ body, annotationId, locale }, key) => {
        return (
          <LocaleString key={annotationId + key + locale} className="mb-3" enableDangerouslySetInnerHTML>
            {body.value}
          </LocaleString>
        );
      })}
    </article>
  );
}

export default function InfoBlockContents(props: {
  canvasId: string;
  fallback?: ReactNode;
  className?: string;
}) {
  return (
    <CanvasContext canvas={props.canvasId}>
      <InfoBlockContentsInner fallback={props.fallback} className={props.className} />
    </CanvasContext>
  );
}
