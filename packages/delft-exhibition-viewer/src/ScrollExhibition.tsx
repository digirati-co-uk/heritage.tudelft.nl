import type { Manifest } from "@iiif/presentation-3";
import { LocaleString, VaultProvider, useExistingVault } from "react-iiif-vault";
import { MapCanvasStrategy } from "@/helpers/MapCanvasStrategy.tsx";
import { CanvasPreviewBlock } from "@/components/CanvasPreviewBlock.tsx";
import { getFloatingFromBehaviours, hasPageScroll } from "@/helpers/exhibition";

interface ScrollExhibitionProps {
  manifest: Manifest;
  canvasId?: string;
  language?: string;
}

export function ScrollExhibition(props: ScrollExhibitionProps) {

  const vault = useExistingVault();

  if (props.manifest?.id && !vault.requestStatus(props.manifest.id)) {
    vault.loadSync(props.manifest.id, JSON.parse(JSON.stringify(props.manifest)));
  }

  return (
    <VaultProvider vault={vault}>
      <div className="w-full min-h-screen bg-black">
        <MapCanvasStrategy onlyCanvasId={props.canvasId} items={props.manifest.items || []}>
          {{
            images: ({ canvas }) => {
                const behaviors = canvas.behavior ?? [];
                // const isPageScroll = hasPageScroll(behaviors);
                const isPageScroll = true;
                
                if (!isPageScroll) {
                  return null;
                }

                const isWidth50 = behaviors.includes("width-50");
                const isOverlayDark = behaviors.includes("backdrop-dark");
                const isOverlayLight = behaviors.includes("backdrop-light");
                
                const { floatingTop, floatingLeft } = getFloatingFromBehaviours({
                  behavior: behaviors,
                  defaultIsFloating: true,
                  defaultFloatingPosition: "bottom-left",
                });
                
                const heroWidthClass = isWidth50 ? "w-1/2" : "w-full";
                const heroAlignClass = behaviors.includes("float-top-right") ||
                  behaviors.includes("float-bottom-right")
                  ? "right-0"
                  : "left-0";

                return (
                  <section
                    className={[
                      "relative w-full min-h-screen overflow-visible",
                      isOverlayLight ? "bg-white" : "bg-black",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "absolute top-0 bottom-0",
                        heroWidthClass,
                        heroAlignClass,
                      ].join(" ")}
                    >
                      {/* Background image */}
                      <div className="relative w-full max-h-[80vh]">
                      <CanvasPreviewBlock
                        canvasId={canvas.id}
                        contain
                        index={0}
                        objectLinks={[]}
                      />

                      {/* Floating overlay */}
                      <div
                        className={[
                          "absolute inset-0 flex pointer-events-none z-50",
                          floatingTop ? "items-start pt-12" : "items-end pb-12",
                          floatingLeft ? "justify-start pl-12" : "justify-end pr-12",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "p-6 max-w-[40vw]",
                            isBackdropLight
                              ? "bg-white text-black"
                              : "bg-black text-white",
                            "bg-opacity-85",
                          ].join(" ")}
                        >
                          <h2 className="text-xl font-semibold">
                            <LocaleString>{canvas.label}</LocaleString>
                          </h2>

                          {canvas.summary && (
                            <div className="mt-2 text-sm">
                              <LocaleString>{canvas.summary}</LocaleString>
                            </div>
                          )}
                        </div>
                      </div>
                      </div>
                    </div>
                  </section>
                );
            },
          }}
        </MapCanvasStrategy>
      </div>
    </VaultProvider>
  );
}
