"use client";
import { Link, getObjectSlug } from "@/navigation";
import viewerConfig from "@/viewers.json";
import { HTMLPortal, type Preset } from "@atlas-viewer/atlas";
import type { InternationalString, Manifest } from "@iiif/presentation-3";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CanvasPanel, useSimpleViewer } from "react-iiif-vault";
import { Box } from "../blocks/Box";
import { DownloadImage } from "../iiif/DownloadImage";
import { ObjectMetadata } from "../iiif/ObjectMetadata";
import { ObjectThumbnails } from "../iiif/ObjectThumbnails";
import { SharingAndViewingLinks } from "../iiif/SharingAndViewingLinks";
import { ViewerSliderControls } from "../iiif/ViewerSliderControls";
import { ViewerZoomControls } from "../iiif/ViewerZoomControls";
import { AutoLanguage } from "./AutoLanguage";

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

    seeAlso: string;
    sharingViewers: string;
    showMore: string;
    showLess: string;
    downloadImage: string;
    currentPage: string;
  };
  exhibitionLinks: Array<null | {
    label: string;
    slug: string;
    thumbnail?: string;
  }>;

  initialCanvasIndex: number;
}

const runtimeOptions = { maxOverZoom: 2 };

export function ManifestPage({ related, manifest, meta, content, exhibitionLinks, initialCanvasIndex }: ManifestPageProps) {
  const context = useSimpleViewer();
  const { currentSequenceIndex } = context;
  const previousSeqIndex = useRef(currentSequenceIndex);
  const atlas = useRef<Preset>();

  // biome-ignore lint/correctness/useExhaustiveDependencies: Needs to run when currentSequenceIndex changes.
  useEffect(() => {
    if (currentSequenceIndex == previousSeqIndex.current) {
      context.setCurrentCanvasIndex(initialCanvasIndex);
    } else {
      context.setCurrentCanvasIndex(currentSequenceIndex);
    }
    if (atlas.current) {
      setTimeout(() => atlas.current?.runtime.world.goHome(true), 5);
    }
  }, [currentSequenceIndex]);

  const partOf = meta.partOfCollections || [];
  const configuredViewers = viewerConfig.viewers.filter((viewer) => viewer.enabled?.includes("object"));

  return (
    <div>
      <h1 className="mb-4 text-4xl font-medium">
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
          <div>
            <div className="iiif-link-wrapper m-4">
              <a
                href={`${manifest.id}?manifest=${manifest.id}`}
                target="_blank"
                title="Drag and Drop IIIF Resource"
                rel="noreferrer"
              >
                <span className="sr-only">IIIF Manifest Link</span>
              </a>
            </div>
          </div>

          <ObjectMetadata />

          {related.length !== 0 && (
            <>
              <h3 className="mb-5 mt-10 text-3xl font-medium">{content.relatedObjects}</h3>
              <div className="mb-4 grid md:grid-cols-3">
                {related.map((item, i) => {
                  if (item === null) return null;

                  return (
                    <Box
                      key={item.slug}
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
        <div className="col-span-1">
          {(meta.partOfCollections || []).length === 0 ? null : (
            <div className="overflow-hidden font-mono">
              <div className="cut-corners w-full place-self-start bg-black p-8 text-white">
                <h3 className="mb-2 uppercase">{content.seeAlso}:</h3>
                <ul className="text-md list-disc underline underline-offset-4">
                  {(meta.partOfCollections || []).map((collection, i) => (
                    <li key={collection.slug} className="list-none">
                      <Link href={`/${collection.slug}`} className="hover:text-slate-300">
                        <AutoLanguage>{collection.label}</AutoLanguage>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {exhibitionLinks.map((item, i) => {
            if (item === null) return null;

            return (
              <Box
                key={item.slug}
                title={item.label}
                unfiltered
                backgroundColor="bg-yellow-400"
                small
                backgroundImage={item.thumbnail}
                link={`/${getObjectSlug(item.slug)}`}
                type="Exhibition"
              />
            );
          })}

          <SharingAndViewingLinks
            resource={{
              id: manifest.id,
              type: "object",
            }}
            content={content}
          />

          <DownloadImage content={content} />
        </div>
      </div>
    </div>
  );
}
