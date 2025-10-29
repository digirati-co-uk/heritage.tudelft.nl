import { useMemo } from "react";
import {
  useCanvas,
  useIIIFLanguage,
  useVault,
} from "react-iiif-vault";

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
