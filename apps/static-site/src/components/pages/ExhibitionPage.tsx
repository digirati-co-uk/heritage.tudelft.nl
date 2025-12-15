"use client";
import { Link } from "@/i18n/navigation";
import type { Manifest } from "@iiif/presentation-3";
import { DelftExhibition } from "exhibition-viewer";
import { useMemo } from "react";
import { EditInManifestEditor } from "../atoms/EditInManifestEditor";

export interface ExhibitionPageProps {
  locale: string;
  manifest: Manifest;
  meta: any;
  slug: string;
  viewObjectLinks?: Array<{
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

export default function ExhibitionPage(props: ExhibitionPageProps) {
  const viewObjectLinks = useMemo(() => {
    return (props.viewObjectLinks || []).map((link) => {
      return {
        ...link,
        component: (
          <div>
            <Link
              href={`/${link.slug.replace("manifests/", "objects/")}?c=${link.targetCanvasId}`}
              className="text-white underline py-3"
            >
              View object
            </Link>
          </div>
        ),
      };
    });
  }, [props.viewObjectLinks]);

  return (
    <>
      <EditInManifestEditor preset="exhibition" id={props.manifest.id} />

      <DelftExhibition
        language={props.locale}
        manifest={props.manifest}
        viewObjectLinks={viewObjectLinks}
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
