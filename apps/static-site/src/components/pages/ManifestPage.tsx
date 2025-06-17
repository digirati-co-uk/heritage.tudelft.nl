"use client";
import { getObjectSlug } from "@/navigation";
import type { InternationalString, Manifest } from "@iiif/presentation-3";
import { Box } from "../blocks/Box";
import { DownloadImage } from "../iiif/DownloadImage";
import { ObjectMetadata } from "../iiif/ObjectMetadata";
import { ObjectThumbnails } from "../iiif/ObjectThumbnails";
import { SharingAndViewingLinks } from "../iiif/SharingAndViewingLinks";
import { AutoLanguage } from "./AutoLanguage";
import { getValue } from "@iiif/helpers/i18n";
import dynamic from "next/dynamic";

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

const ManifestViewer = dynamic(() => import("../iiif/ManifestViewer"), {
  ssr: false,
});

export function ManifestPage({
  related,
  manifest,
  meta,
  content,
  exhibitionLinks,
  initialCanvasIndex,
}: ManifestPageProps) {
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
      <div className="relative h-[800px] max-h-[70%] bg-[#373737]">
        <ManifestViewer initialCanvasIndex={initialCanvasIndex} manifest={manifest} runtimeOptions={runtimeOptions} />
      </div>
      <div className="mb-4">
        <ObjectThumbnails />
      </div>
      <div className="grid-cols-3 md:grid">
        <div className="col-span-2">
          <ObjectMetadata />

          {(related.length !== 0 || meta.partOfCollections?.length !== 0) && (
            <>
              <h3 className="mb-5 mt-10 text-3xl font-medium">{content.relatedObjects}</h3>
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

          <DownloadImage content={content} />
        </div>
      </div>
    </div>
  );
}
