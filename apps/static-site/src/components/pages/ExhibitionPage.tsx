import { Manifest } from "@iiif/presentation-3";
import { createPaintingAnnotationsHelper } from "@iiif/helpers/painting-annotations";
import { getRenderingStrategy } from "react-iiif-vault/utils";
import { TitlePanel } from "../exhibitions/TitleBlock";
import { InfoBlock } from "../exhibitions/InfoBlock";
import { ImageBlock } from "../exhibitions/ImageBlock";
import { MediaBlock } from "../exhibitions/MediaBlock";
import { Slot } from "@/blocks/slot";
import { TOCBar } from "../exhibitions/TOCBar";
import { getTranslations } from "next-intl/server";

export interface ExhibitionPageProps {
  locale: string;
  manifest: Manifest;
  meta: {};
  slug: string;
  viewObjectLinks: Array<{ service: string; slug: string; canvasId: string; targetCanvasId: string }>;
}

export async function ExhibitionPage(props: ExhibitionPageProps) {
  const helper = createPaintingAnnotationsHelper();
  const canvas: any = props.manifest.items[0];
  const t = await getTranslations();
  const TOCHeading = t("Table of contents");

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

          //console.log(strategy);

          if (strategy.type === "textual-content") {
            return <InfoBlock key={idx} canvas={canvas} strategy={strategy} id={idx} />;
          }

          if (strategy.type === "images") {
            return <ImageBlock key={idx} canvas={canvas} index={idx} objectLinks={foundLinks} id={idx} />;
          }

          if (strategy.type === "media") {
            return <MediaBlock key={idx} canvas={canvas} strategy={strategy} index={idx} id={idx} />;
          }

          return null;
        })}

        <TOCBar manifest={props.manifest} TOCHeading={TOCHeading} />
      </div>
      {/* <Slot name="exhibition" context={{ locale: props.locale, exhibition: props.slug }} /> */}
    </>
  );
}
