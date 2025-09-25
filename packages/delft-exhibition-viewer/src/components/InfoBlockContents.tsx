import { CanvasContext, useCanvas, useIIIFLanguage, useVault } from "react-iiif-vault";
import { LocaleString } from "react-iiif-vault";

export function InfoBlockContentsInner() {
  const canvas = useCanvas();
  const vault = useVault();
  const locale = useIIIFLanguage();

  if (!canvas) return null;

  const annotationPage = vault.get(canvas.annotations || []);
  const annotations = vault.get(annotationPage.flatMap((page) => page.items || []));

  if (!annotations.length) {
    const paintingPage = canvas.items[0] ? vault.get(canvas.items[0]) : null;
    if (paintingPage?.items.length) {
      annotations.push(...vault.get(paintingPage.items));
    } else return null;
  }

  return (
    <article className="prose prose-lg h-fit max-w-2xl leading-snug md:leading-normal">
      {annotations.map((annotation: any) => {
        const bodies = vault.get(Array.isArray(annotation.body) ? annotation.body : [annotation.body]);
        const toShow = bodies.length === 1 ? bodies : bodies.filter((t: any) => (t as any).language === locale);

        return toShow.map((body: any, key: number) => {
          return (
            <LocaleString key={annotation.id + key} className="mb-3" enableDangerouslySetInnerHTML>
              {body.value}
            </LocaleString>
          );
        });
      })}
    </article>
  );
}

export default function InfoBlockContents(props: { canvasId: string }) {
  return (
    <CanvasContext canvas={props.canvasId}>
      <InfoBlockContentsInner />
    </CanvasContext>
  );
}
