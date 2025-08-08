import { type ReactNode, useMemo } from "react";
import {
  CanvasContext,
  useCanvas,
  useIIIFLanguage,
  useVault,
} from "react-iiif-vault";
import { LocaleString } from "react-iiif-vault";

export function useInfoBlockContents() {
  const canvas = useCanvas();
  const vault = useVault();
  const locale = useIIIFLanguage();
  const annotationPage = vault.get(canvas?.annotations || []);
  const annotations = vault.get(
    annotationPage.flatMap((page) => page.items || []),
  );

  return useMemo(() => {
    const returnItems: {
      body: { value: string };
      locale: string;
      annotationId: string;
    }[] = [];

    if (!canvas || !annotations.length) {
      return returnItems;
    }

    for (const annotation of annotations) {
      const bodies = vault.get(
        Array.isArray(annotation.body) ? annotation.body : [annotation.body],
      );
      const toShow =
        bodies.length === 1
          ? bodies
          : bodies.filter((t: any) => (t as any).language === locale);

      for (const item of toShow) {
        if (((item as any).value || "").trim() === "") continue;

        returnItems.push({
          body: item as any,
          locale,
          annotationId: annotation.id,
        });
      }
    }

    return returnItems;
  }, [annotations, vault, locale, canvas]);
}

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
