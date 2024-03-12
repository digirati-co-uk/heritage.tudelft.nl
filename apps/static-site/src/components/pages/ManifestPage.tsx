"use client";
import { Manifest, InternationalString } from "@iiif/presentation-3";
import { CanvasPanel, useSimpleViewer } from "react-iiif-vault";
import { ObjectMetadata } from "../iiif/ObjectMetadata";
import { ObjectThumbnails } from "../iiif/ObjectThumbnails";
import { ViewerSliderControls } from "../iiif/ViewerSliderControls";
import { ViewerZoomControls } from "../iiif/ViewerZoomControls";
import { Box } from "../blocks/Box";
import { AutoLanguage } from "./AutoLanguage";
import { useEffect, useRef } from "react";
import type { Preset } from "@atlas-viewer/atlas";
import { Link, getObjectSlug } from "@/navigation";

interface ManifestPageProps {
  manifest: Manifest;
  meta: {
    totalItems: number;
    thumbnail: { id: string; type: string; width: number; height: number };
    label: string;
    partOfCollections: Array<{
      id: string;
      slug: string;
      label: InternationalString;
    }>;
  };
  related: Array<null | {
    label: string;
    slug: string;
    thumbnail?: string;
  }>;

  content: {
    untitled: string;
    relatedObjects: string;
    partOfCollections: string;
  };
}

const runtimeOptions = { maxOverZoom: 2 };

export function ManifestPage({ related, manifest, meta, content }: ManifestPageProps) {
  const { currentSequenceIndex } = useSimpleViewer();

  const atlas = useRef<Preset>();

  useEffect(() => {
    if (atlas.current) {
      setTimeout(() => atlas.current?.runtime.world.goHome(true), 5);
    }
  }, [currentSequenceIndex]);

  return (
    <div>
      <h1 className="my-4 text-4xl">
        <AutoLanguage>{manifest.label || content.untitled}</AutoLanguage>
      </h1>
      {manifest.requiredStatement ? (
        <p>
          <AutoLanguage>{manifest.requiredStatement.value}</AutoLanguage>
        </p>
      ) : null}
      <div className="relative h-[800px] max-h-[70%]">
        <CanvasPanel.Viewer
          onCreated={(preset) => {
            atlas.current = preset;
          }}
          htmlChildren={null}
          key={manifest.id}
          runtimeOptions={runtimeOptions}
        >
          <CanvasPanel.RenderCanvas
            strategies={["3d-model", "images", "textual-content", "media"]}
            renderViewerControls={ViewerZoomControls}
          />
        </CanvasPanel.Viewer>
        <ViewerSliderControls />
      </div>
      <div className="mb-4">
        <ObjectThumbnails />
      </div>
      <div className="grid-cols-3 md:grid">
        <div className="col-span-2">
          <ObjectMetadata />

          {related.length !== 0 && (
            <>
              <h3 className="mb-5 mt-10 text-3xl font-bold">{content.relatedObjects}</h3>
              <div className="mb-4 grid md:grid-cols-3">
                {related.map((item, i) => {
                  if (item === null) return null;

                  return (
                    <Box
                      key={i}
                      title={item.label}
                      unfiltered
                      small
                      backgroundImage={item.thumbnail}
                      link={`/${getObjectSlug(item.slug)}`}
                      type="Object"
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
        {(meta.partOfCollections || []).length === 0 ? null : (
          <div className="col-span-1 overflow-hidden">
            <div className="cut-corners aspect-square place-self-start bg-black p-8 text-white">
              <h3 className="mb-2 text-2xl font-bold">{content.partOfCollections}</h3>
              <ul className="text-md ml-4 list-disc underline underline-offset-4">
                {(meta.partOfCollections || []).map((collection, i) => (
                  <li key={i}>
                    <Link href={`/${collection.slug}`} className="hover:text-slate-300">
                      <AutoLanguage>{collection.label}</AutoLanguage>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
