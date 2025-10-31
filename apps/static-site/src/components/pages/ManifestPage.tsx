"use client";
import { getObjectSlug } from "@/i18n/navigation";
import type { Preset } from "@atlas-viewer/atlas";
import {
  normaliseContentState,
  parseContentState,
  validateContentState,
} from "@iiif/helpers";
import { getValue } from "@iiif/helpers/i18n";
import type { InternationalString, Manifest } from "@iiif/presentation-3";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CanvasPanel,
  useSimpleViewer,
  AtlasStoreProvider,
} from "react-iiif-vault";
import { Box } from "../blocks/Box";
import { DownloadImage } from "../iiif/DownloadImage";
import { ObjectMetadata } from "../iiif/ObjectMetadata";
import { ObjectThumbnails } from "../iiif/ObjectThumbnails";
import { RangeNavigation } from "../iiif/RangeNavigation";
import { SharingAndViewingLinks } from "../iiif/SharingAndViewingLinks";
import { ViewerSliderControls } from "../iiif/ViewerSliderControls";
import { ViewerZoomControls } from "../iiif/ViewerZoomControls";
import { AutoLanguage } from "./AutoLanguage";
import { parseXywh } from "@/helpers/content-state";
import type { ZoomRegion } from "@/helpers/content-state";
import { SharingOptionsDialog } from "../iiif/SharingOptionsDialog";

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
  const { currentSequenceIndex, setCurrentCanvasId, setCurrentCanvasIndex } =
    context;
  const previousSeqIndex = useRef(currentSequenceIndex);
  const atlas = useRef<Preset | null>(null);
  const stateRegion = useRef<ZoomRegion | null>(null);
  const [sharingOptionsOpen, setSharingOptionsOpen] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const contentState = searchParams.get("iiif-content");
  const canvasId = searchParams.get("c");
  const initialId = searchParams.get("id");
  const xywh = searchParams.get("xywh");

  // biome-ignore lint/correctness/useExhaustiveDependencies: Needs to run when currentSequenceIndex changes.
  useEffect(() => {
    if (currentSequenceIndex === previousSeqIndex.current) {
      context.setCurrentCanvasIndex(initialCanvasIndex);
    } else {
      context.setCurrentCanvasIndex(currentSequenceIndex);
    }
    if (atlas.current) {
      setTimeout(() => atlas.current?.runtime.world.goHome(true), 5);
    }
  }, [currentSequenceIndex]);

  useEffect(() => {
    if ((canvasId || initialId) && !contentState) {
      const parsedRegion = parseXywh(xywh);
      if (parsedRegion) {
        stateRegion.current = parsedRegion as ZoomRegion;
      }
      if (canvasId?.startsWith("http")) {
        setCurrentCanvasId(canvasId);
        return;
      }
      const parsed = canvasId
        ? Number.parseInt(canvasId, 10)
        : initialId
          ? Number.parseInt(initialId, 10)
          : 0;
      if (!Number.isNaN(parsed)) {
        setCurrentCanvasIndex(parsed);
      }
      return;
    }

    if (!contentState) return;

    try {
      const parsedState = parseContentState(contentState);
      if (!validateContentState(parsedState)) return;

      const normalisedState = normaliseContentState(parsedState);
      const mainTarget = normalisedState.target[0];
      if (!mainTarget) return;

      if (mainTarget.source.type !== "Canvas") return;

      // Grab the Canvas ID and optional Manifest ID from the content state
      const stateCanvasId = mainTarget.source.id;
      const stateManifestId = mainTarget.source.partOf?.[0]?.id;

      // Manifest doesn't match the current manifest
      if (stateManifestId && stateManifestId !== manifest.id) return;

      // We can apply the content state now.
      setCurrentCanvasId(stateCanvasId);
      if (mainTarget.selector?.spatial) {
        // We have a valid region to go to.
        // Note: this could technically be a "point" which wouldn't have a height/width.
        stateRegion.current = mainTarget.selector.spatial as ZoomRegion;
      }
    } catch {
      // ignore bad iiif-content param
    }
  }, [
    canvasId,
    manifest.id,
    contentState,
    setCurrentCanvasId,
    setCurrentCanvasIndex,
  ]);

  return (
    <AtlasStoreProvider>
      {sharingOptionsOpen && (
        <SharingOptionsDialog
          manifestId={manifest.id}
          canvasURI={manifest.items?.[currentSequenceIndex]?.id}
          canvasSeqIdx={currentSequenceIndex}
          canvasLabel={manifest.items?.[currentSequenceIndex]?.label}
          zoomRegion={stateRegion.current}
          sharingOptionsOpen={sharingOptionsOpen}
          setSharingOptionsOpen={setSharingOptionsOpen}
        />
      )}
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
              if (stateRegion.current) {
                preset.runtime.world.gotoRegion(stateRegion.current);
              }
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
              sharingOptionsOpen={sharingOptionsOpen}
              setSharingOptionsOpen={setSharingOptionsOpen}
            />

            <RangeNavigation content={content} />

            <DownloadImage content={content} />
          </div>
        </div>
      </div>
    </AtlasStoreProvider>
  );
}
