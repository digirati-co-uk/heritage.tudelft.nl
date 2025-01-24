import { Manifest } from "@iiif/presentation-3";
import { createPaintingAnnotationsHelper } from "@iiif/helpers/painting-annotations";
import { getRenderingStrategy } from "react-iiif-vault/utils";
import { TitlePanel } from "../exhibitions/TitleBlock";
import { InfoBlock } from "../exhibitions/InfoBlock";
import { ImageBlock } from "../exhibitions/ImageBlock";
import { MediaBlock } from "../exhibitions/MediaBlock";
import { Slot } from "@/blocks/slot";
import { TOCBar } from "../exhibitions/TOCBar";

export interface ExhibitionPageProps {
  locale: string;
  manifest: Manifest;
  meta: {};
  slug: string;
  viewObjectLinks: Array<{ service: string; slug: string; canvasId: string; targetCanvasId: string }>;
  toc?: string;
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
          const strategy = getRenderingStrategy({
            canvas,
            loadImageService: () => void 0,
            paintables,
            supports: ["empty", "images", "media", "3d-model", "textual-content", "complex-timeline"],
          });

          const foundLinks = props.viewObjectLinks.filter((link) => link.canvasId === canvas.id);

          if (strategy.type === "textual-content") {
            return <InfoBlock key={idx} canvas={canvas} strategy={strategy} />;
          }

          if (strategy.type === "images") {
            return <ImageBlock key={idx} canvas={canvas} index={idx} objectLinks={foundLinks} />;
          }

          if (strategy.type === "media") {
            return <MediaBlock key={idx} canvas={canvas} strategy={strategy} index={idx} />;
          }

          return null;
        })}

        <TOCBar manifest={props.manifest} toc={props.toc} />
      </div>
      {/* <Slot name="exhibition" context={{ locale: props.locale, exhibition: props.slug }} /> */}
    </>
  );
}
