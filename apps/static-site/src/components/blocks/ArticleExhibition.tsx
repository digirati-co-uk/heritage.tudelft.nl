"use client";
import type { ViewObjectLink } from "@/helpers/get-view-object-links";
import { useLoadManifest } from "@/hooks/use-load-manifest";
import { useViewObjectLinks } from "@/hooks/use-view-object-links";
import { DelftExhibition } from "exhibition-viewer";

export interface ArticleExhibitionProps {
  manifest: string;
  canvas: string;
  viewObjectLinks?: ViewObjectLink[];
}

export function ArticleExhibition(props: ArticleExhibitionProps) {
  const { data: manifest } = useLoadManifest(props);
  const viewObjectLinks = useViewObjectLinks(props.viewObjectLinks);

  if (!manifest) {
    return null;
  }

  return (
    <div className="overflow-hidden w-full inline-block">
      <DelftExhibition
        manifest={manifest as any}
        canvasId={props.canvas}
        options={{
          coverImages: true,
          fullWidthGrid: true,
        }}
        language="en"
        viewObjectLinks={viewObjectLinks}
      />
    </div>
  );
}
