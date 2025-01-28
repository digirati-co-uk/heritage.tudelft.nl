import { createPaintingAnnotationsHelper } from "@iiif/helpers/painting-annotations";
import type { Manifest } from "@iiif/presentation-3";
import {
  type ReactNode,
  Suspense,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  LanguageProvider,
  VaultProvider,
  useExistingVault,
} from "react-iiif-vault";
import { getRenderingStrategy } from "react-iiif-vault/utils";
import { ImageBlock } from "./components/ImageBlock";
import { InfoBlock } from "./components/InfoBlock";
import { MediaBlock } from "./components/MediaBlock";
import { TitlePanel } from "./components/TitleBlock";
import "./styles/lib.css";

export type DelftExhibitionProps = {
  manifest: Manifest;
  language: string | undefined;
  viewObjectLinks: Array<{
    service: string;
    slug: string;
    canvasId: string;
    targetCanvasId: string;
    component: ReactNode;
  }>;
};

export function DelftExhibition(props: DelftExhibitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const vault = useExistingVault();
  const helper = createPaintingAnnotationsHelper();

  if (props.manifest?.id && !vault.requestStatus(props.manifest.id)) {
    vault.loadSync(
      props.manifest.id,
      JSON.parse(JSON.stringify(props.manifest)),
    );
  }

  return (
    <VaultProvider vault={vault}>
      <LanguageProvider language={props.language || "en"}>
        <div ref={containerRef}>
          <div
            className={
              enabled
                ? ""
                : "delft-exhibition-viewer slides mb-12 auto-rows-auto grid-cols-12 content-center justify-center lg:grid"
            }
          >
            <TitlePanel manifest={props.manifest} />

            {props.manifest.items.map((canvas: any, idx) => {
              const paintables = helper.getPaintables(canvas);
              try {
                const strategy = getRenderingStrategy({
                  canvas,
                  loadImageService: (t) => t,
                  paintables,
                  supports: [
                    "empty",
                    "images",
                    "media",
                    "video",
                    "3d-model",
                    "textual-content",
                    "complex-timeline",
                  ],
                });

                const foundLinks = props.viewObjectLinks.filter(
                  (link) => link.canvasId === canvas.id,
                );

                if (strategy.type === "textual-content") {
                  return (
                    <InfoBlock
                      key={idx}
                      canvas={canvas}
                      strategy={strategy}
                      locale={props.language || "en"}
                    />
                  );
                }

                if (strategy.type === "images") {
                  return (
                    <ImageBlock
                      key={idx}
                      canvas={canvas}
                      index={idx}
                      objectLinks={foundLinks}
                    />
                  );
                }

                if (strategy.type === "media") {
                  return (
                    <Suspense
                      key={idx}
                      fallback={
                        <div className={"cut-corners bg-black text-white"} />
                      }
                    >
                      <MediaBlock
                        key={idx}
                        canvas={canvas}
                        strategy={strategy}
                        index={idx}
                      />
                    </Suspense>
                  );
                }

                return null;
              } catch (e) {
                return null;
              }
            })}
          </div>
        </div>
      </LanguageProvider>
    </VaultProvider>
  );
}
