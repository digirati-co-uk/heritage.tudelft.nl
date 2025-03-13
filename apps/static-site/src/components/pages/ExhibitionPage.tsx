"use client";
import type { Manifest } from "@iiif/presentation-3";
import { DelftExhibition } from "delft-exhibition-viewer";
import { EditInManifestEditor } from "../atoms/EditInManifestEditor";

export interface ExhibitionPageProps {
  locale: string;
  manifest: Manifest;
  meta: {};
  slug: string;
  viewObjectLinks: Array<{
    service: string;
    slug: string;
    canvasId: string;
    targetCanvasId: string;
  }>;
  content: {
    exhibition: string;
    tableOfContents: string;
  };
}

const useOldHeader = ["corona-chronicles"];

export default async function ExhibitionPage(props: ExhibitionPageProps) {
  return (
    <>
      <EditInManifestEditor preset="exhibition" id={props.manifest.id} />

      <DelftExhibition
        language={props.locale}
        manifest={props.manifest}
        viewObjectLinks={props.viewObjectLinks as any}
        options={{
          alternativeImageMode: true,
          cutCorners: true,
          fullTitleBar: !useOldHeader.includes(props.slug),
        }}
        content={props.content}
      />
    </>
  );
}
