"use client";
import { IIIF_URL } from "@/iiif";
import { fetch } from "@iiif/helpers";
import { useQuery } from "@tanstack/react-query";
import { DelftExhibition } from "exhibition-viewer";
import { useVault } from "react-iiif-vault";

export function ArticleExhibition(props: { manifest: string; canvas: string }) {
  const { data: manifest } = useQuery({
    queryKey: ["manifest", props.manifest],
    queryFn: () => {
      if (!props.manifest) {
        return null;
      }

      if (props.manifest.startsWith("http")) {
        return fetch(props.manifest);
      }

      return fetch(`${IIIF_URL}${props.manifest}`);
    },
  });

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
        viewObjectLinks={[]}
      />
    </div>
  );
}
