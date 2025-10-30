"use client";
import { getObjectSlug } from "@/navigation";
import type { Preset } from "@atlas-viewer/atlas";
import type { InternationalString, Manifest } from "@iiif/presentation-3";
import { useEffect, useRef } from "react";
import {
  CanvasPanel,
  useSimpleViewer,
  AtlasStoreProvider,
} from "react-iiif-vault";
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

type ZoomRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

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

function parseXywh(xywh: string) {
  const regex = /\d+,\d+,\d+,\d+$/;
  if (regex.test(xywh)) {
    const arr = xywh.split(",");
    const numArr: number[] = arr.map((n) => Number.parseInt(n));
    return {
      x: numArr[0],
      y: numArr[1],
      width: numArr[2],
      height: numArr[3],
    };
  }
  return undefined;
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
  const previousSeqIndex = useRef(currentSequenceIndex);
  const atlas = useRef<Preset>();
  const stateRegion = useRef<ZoomRegion>();
  const stateCanvasURI = useRef<string>();
  const searchParams = useSearchParams();
  const state = searchParams.get("iiif-content");
  const xywh = searchParams.get("xywh");

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

  useEffect(() => {
    let parsedState;
    if (xywh) {
      const parsedRegion: ZoomRegion = parseXywh(xywh);
      stateRegion.current = parsedRegion;
    } else if (state) {
      try {
        parsedState = state && parseContentState(state);
      } catch {
        // ignore bad iiif-content param
      }
      const isStateValid = parsedState && validateContentState(parsedState);
      const normalisedState =
        isStateValid && parsedState && normaliseContentState(parsedState);
      const stateCanvasId: string = normalisedState?.target[0].source.id;
      setCurrentCanvasId(stateCanvasId);
      stateCanvasURI.current = stateCanvasId;
      stateRegion.current = normalisedState?.target[0].selector.spatial;
    }
  }, []);

  return (
    <AtlasStoreProvider>
      <div>
        <div className="border border-red-800">
          atlas region:{" "}
          {`${atlas.current?.runtime.world.x}, ${atlas.current?.runtime.world.y}, ${atlas.current?.runtime.world.width}, ${atlas.current?.runtime.world.height}`}
        </div>
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
              canvasSeqIdx={currentSequenceIndex}
              canvasURI={manifest.items?.[currentSequenceIndex]?.id}
              zoomRegion={stateRegion.current}
              content={content}
            />

            <RangeNavigation content={content} />

            <DownloadImage content={content} />
          </div>
        </div>
      </div>
    </AtlasStoreProvider>
  );
}
