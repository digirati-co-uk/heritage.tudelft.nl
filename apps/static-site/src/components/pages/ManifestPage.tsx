"use client";
import { getObjectSlug } from "@/navigation";
import type { Preset } from "@atlas-viewer/atlas";
import type { InternationalString, Manifest } from "@iiif/presentation-3";
import { useEffect, useRef, useState } from "react";
import { CanvasPanel, useSimpleViewer } from "react-iiif-vault";
import { Box } from "../blocks/Box";
import { DownloadImage } from "../iiif/DownloadImage";
import { ObjectMetadata } from "../iiif/ObjectMetadata";
import { ObjectThumbnails } from "../iiif/ObjectThumbnails";
import { SharingAndViewingLinks } from "../iiif/SharingAndViewingLinks";
import { ViewerSliderControls } from "../iiif/ViewerSliderControls";
import { ViewerZoomControls } from "../iiif/ViewerZoomControls";
import { RangeNavigation } from "../iiif/RangeNavigation";
import { AutoLanguage } from "./AutoLanguage";
import { getValue } from "@iiif/helpers/i18n";
import {
  parseContentState,
  validateContentState,
  normaliseContentState,
} from "@iiif/helpers";
import { useSearchParams } from "next/navigation";

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
    iiifLabel: string;
    downloadImage: string;
    download: string;
    currentPage: string;
    copiedMessage: string;
  };
  exhibitionLinks: Array<null | {
    label: string;
    slug: string;
    thumbnail?: string;
  }>;

  initialCanvasIndex: number;
}

const runtimeOptions = { maxOverZoom: 2 };

export function ManifestPage({
  related,
  manifest,
  meta,
  content,
  exhibitionLinks,
  initialCanvasIndex,
}: ManifestPageProps) {
  const context = useSimpleViewer();
  const { currentSequenceIndex, setCurrentCanvasId } = context;
  //const previousSeqIndex = useRef(currentSequenceIndex);
  const [previousSeqIndex, setPreviousSeqIndex] = useState<number>(0);
  const atlas = useRef<Preset>();
  const searchParams = useSearchParams();
  const [region, setRegion] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>({ x: 0, y: 0, width: 10, height: 10 });

  //isStateValid && stateCanvasId && setCurrentCanvasId(stateCanvasId);
  //xywh && tell viewer to zoom to region

  // biome-ignore lint/correctness/useExhaustiveDependencies: Needs to run when currentSequenceIndex changes.
  useEffect(() => {
    console.log("effect");
    const state = searchParams.get("state");
    const parsedState = state && parseContentState(state);
    const isStateValid = parsedState && validateContentState(parsedState);
    const normalisedState =
      isStateValid && parsedState && normaliseContentState(parsedState);
    const stateCanvasId = normalisedState?.target[0].source.id;
    const box = normalisedState?.target[0].selector.spatial;
    console.log("normalisedState", normalisedState);
    //setRegion({ x: box.x, y: box.y, width: box.w, height: box.height });
    //const xywh = `${box.x},${box.y},${box.width},${box.height}`;
    //const stateURI = `${stateCanvasId}#xywh=${xywh}`;
    //console.log("state URI", stateURI);

    // If chosen canvas has changed, go there. Otherwise go to any canvas specified by content state.
    const tempPrevIdx = currentSequenceIndex;

    if (currentSequenceIndex != previousSeqIndex) {
      context.setCurrentCanvasIndex(currentSequenceIndex);
    } else if (initialCanvasIndex) {
      context.setCurrentCanvasIndex(initialCanvasIndex);
    } else if (stateCanvasId && !currentSequenceIndex) {
      setCurrentCanvasId(stateCanvasId);
    }
    setPreviousSeqIndex(tempPrevIdx);
    if (atlas.current) {
      setTimeout(() => atlas.current?.runtime.world.goHome(true), 5);
    }
  }, [currentSequenceIndex]);

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
            // preset.runtime.world.gotoRegion({
            //   x: region!.x,
            //   y: region!.y,
            //   width: region!.width,
            //   height: region!.height,
            // });
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

          {(related.length !== 0 || meta.partOfCollections?.length !== 0) && (
            <>
              <h3 className="mb-5 mt-10 text-3xl font-medium">
                {content.relatedObjects}
              </h3>
              <div className="mb-4 grid md:grid-cols-3">
                {(meta.partOfCollections || []).map((collection, i) => (
                  <Box
                    key={collection.slug}
                    title={getValue(collection.label)}
                    unfiltered
                    fallbackBackgroundColor="bg-cyan-500"
                    small
                    dark
                    link={`/${getObjectSlug(collection.slug)}`}
                    type="Collection"
                  />
                ))}
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

          <RangeNavigation content={content} />

          <DownloadImage content={content} />
        </div>
      </div>
    </div>
  );
}
