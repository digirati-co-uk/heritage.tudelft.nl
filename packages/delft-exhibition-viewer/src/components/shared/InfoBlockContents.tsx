import { useInfoBlockContents } from "@/hooks/use-info-box-contents";
import type { ReactNode } from "react";
import { CanvasContext } from "react-iiif-vault";
import { LocaleString } from "react-iiif-vault";

export function InfoBlockContentsInner({ fallback }: { fallback?: ReactNode }) {
  const annotationsToShow = useInfoBlockContents();

  return (
    <article className="prose prose-lg h-fit max-w-2xl leading-snug md:leading-normal">
      {annotationsToShow.length === 0 ? fallback || null : null}
      {annotationsToShow.map(({ body, annotationId, locale }, key) => {
        return (
          <LocaleString
            key={annotationId + key + locale}
            className="mb-3"
            enableDangerouslySetInnerHTML
          >
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
}) {
  return (
    <CanvasContext canvas={props.canvasId}>
      <InfoBlockContentsInner fallback={props.fallback} />
    </CanvasContext>
  );
}
