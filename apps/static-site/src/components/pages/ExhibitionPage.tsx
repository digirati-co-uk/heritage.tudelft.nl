"use client";
import { Slot } from "@/blocks/slot";
import { createPaintingAnnotationsHelper } from "@iiif/helpers/painting-annotations";
import type { Manifest } from "@iiif/presentation-3";
import { Suspense, useState } from "react";
import { getRenderingStrategy } from "react-iiif-vault/utils";
import { ImageBlock } from "../exhibitions/ImageBlock";
import { InfoBlock } from "../exhibitions/InfoBlock";
import { MediaBlock } from "../exhibitions/MediaBlock";
import { TOCBar } from "../exhibitions/TOCBar";
import { TitlePanel } from "../exhibitions/TitleBlock";

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
}

export function ExhibitionPage(props: ExhibitionPageProps) {
  const helper = createPaintingAnnotationsHelper();
  const canvas: any = props.manifest.items[0];
  const TOCHeading = "Table of contents"; // TODO make intl
  const [tocBarContent, setTocBarContent] = useState<string>("");
  const [tocOpen, setTocOpen] = useState(false);
  const [tocBarShown, setTocBarShown] = useState(false);

  function updateTocBar(heading: string, position: number, showTocBar: boolean) {
    setTocBarContent(heading);
    window.location.hash = position.toString();
    setTocBarShown(showTocBar);
  }

  if (!canvas) return null;

  return (
    <>
      <div className="mb-12 auto-rows-auto grid-cols-12 content-center justify-center pt-5 lg:grid">
        {props.manifest.items.map((canvas: any, idx) => {
          const paintables = helper.getPaintables(canvas);
          try {
            const strategy = getRenderingStrategy({
              canvas,
              loadImageService: (t) => t,
              paintables,
              supports: ["empty", "images", "media", "video", "3d-model", "textual-content", "complex-timeline"],
            });

            const foundLinks = props.viewObjectLinks.filter((link) => link.canvasId === canvas.id);

            if (strategy.type === "textual-content") {
              return (
                <>
                  <TitlePanel
                    manifest={props.manifest}
                    position={idx}
                    key={`exhibition_heading_${idx}`}
                    updateTocBar={updateTocBar}
                    setTocOpen={setTocOpen}
                    tocOpen={tocOpen}
                  />
                  <InfoBlock key={`info${idx}`} canvas={canvas} strategy={strategy} id={idx} locale={props.locale} />
                </>
              );
            }

            if (strategy.type === "images") {
              return (
                <>
                  <TitlePanel
                    manifest={props.manifest}
                    position={idx}
                    key={`exhibition_heading_${idx}`}
                    updateTocBar={updateTocBar}
                    setTocOpen={setTocOpen}
                    tocOpen={tocOpen}
                  />
                  <ImageBlock key={`image${idx}`} canvas={canvas} index={idx} objectLinks={foundLinks} id={idx} />
                </>
              );
            }

            if (strategy.type === "media") {
              return (
                <>
                  <TitlePanel
                    manifest={props.manifest}
                    position={idx}
                    key={`exhibition_heading_${idx}`}
                    updateTocBar={updateTocBar}
                    setTocOpen={setTocOpen}
                    tocOpen={tocOpen}
                  />
                  <Suspense key={idx} fallback={<div className={"cut-corners bg-black text-white"} />}>
                    <MediaBlock key={`media${idx}`} canvas={canvas} strategy={strategy} index={idx} id={idx} />
                  </Suspense>
                </>
              );
            }

            return null;
          } catch (e) {
            return null;
          }
        })}
        <TOCBar
          manifest={props.manifest}
          heading={TOCHeading}
          barContent={tocBarContent}
          tocOpen={tocOpen}
          setTocOpen={setTocOpen}
          tocBarShown={true} //always show toc bar - don't hide when scrolled to top anymore
        />
      </div>
      {/* <Slot name="exhibition" context={{ locale: props.locale, exhibition: props.slug }} /> */}
    </>
  );
}
