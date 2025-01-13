import { Slot } from "@/blocks/slot";
import { createPaintingAnnotationsHelper } from "@iiif/helpers/painting-annotations";
import type { Manifest } from "@iiif/presentation-3";
import { Suspense } from "react";
import { getRenderingStrategy } from "react-iiif-vault/utils";
import { ImageBlock } from "../exhibitions/ImageBlock";
import { InfoBlock } from "../exhibitions/InfoBlock";
import { MediaBlock } from "../exhibitions/MediaBlock";
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

export async function ExhibitionPage(props: ExhibitionPageProps) {
  const helper = createPaintingAnnotationsHelper();
  const canvas: any = props.manifest.items[0];

  if (!canvas) return null;

  return (
    <>
      <div className="mb-12 auto-rows-auto grid-cols-12 content-center justify-center lg:grid">
        <TitlePanel manifest={props.manifest} />

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
              return <InfoBlock key={idx} canvas={canvas} strategy={strategy} locale={props.locale} />;
            }

            if (strategy.type === "images") {
              return <ImageBlock key={idx} canvas={canvas} index={idx} objectLinks={foundLinks} />;
            }

            if (strategy.type === "media") {
              return (
                <Suspense key={idx} fallback={<div className={"cut-corners bg-black text-white"} />}>
                  <MediaBlock key={idx} canvas={canvas} strategy={strategy} index={idx} />
                </Suspense>
              );
            }

            return null;
          } catch (e) {
            return null;
          }
        })}
      </div>

      <Slot name="exhibition" context={{ locale: props.locale, exhibition: props.slug }} />
    </>
  );
}
