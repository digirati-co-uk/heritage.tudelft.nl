import type { Manifest } from "@iiif/presentation-3";
import { useManifest } from "react-iiif-vault";
import { Provider } from "./components/Provider";
import { ScrollImageBlock } from "./components/scroll/ScrollImageBlock";
import { ScrollInfoBlock } from "./components/scroll/ScrollInfoBlock";
import { ScrollMediaBlock } from "./components/scroll/ScrollMediaBlock";
import { ScrollTitleBlock } from "./components/scroll/ScrollTitleBlock";
import { ScrollTourBlock } from "./components/scroll/ScrollTourBlock";
import { MapCanvasStrategy } from "./helpers/MapCanvasStrategy";
import type { ObjectLink } from "./helpers/object-links";

export type ScrollExhibitionProps = {
  manifest: Manifest | string;
  canvasId?: string;
  language?: string;
  skipLoadManifest?: boolean;
  viewObjectLinks?: Array<ObjectLink>;
  showTableOfContents?: boolean;
};

export function ScrollExhibition(props: ScrollExhibitionProps) {
  return (
    <Provider language={props.language} manifest={props.manifest} skipLoadManifest={props.skipLoadManifest}>
      <ScrollExhibitionContents
        canvasId={props.canvasId}
        viewObjectLinks={props.viewObjectLinks}
        showTableOfContents={props.showTableOfContents}
      />
    </Provider>
  );
}

function ScrollExhibitionContents({
  canvasId,
  viewObjectLinks,
  showTableOfContents,
}: {
  canvasId?: string;
  viewObjectLinks?: Array<ObjectLink>;
  showTableOfContents?: boolean;
}) {
  const manifest = useManifest();

  if (!manifest) return null;

  return (
    <div className="w-full min-h-screen bg-black">
      <ScrollTitleBlock manifest={manifest} index={0} showTableOfContents={showTableOfContents} />
      <MapCanvasStrategy onlyCanvasId={canvasId} items={manifest.items || []}>
        {{
          images: ({ index, canvas, strategy }) => {
            console.log(canvas.annotations);
            const foundLinks = (viewObjectLinks || []).filter((link) => link.canvasId === canvas.id);

            if (canvas.annotations.length) {
              return <ScrollTourBlock key={canvas.id} canvas={canvas} index={index + 1} />;
            }

            return (
              <ScrollImageBlock
                key={canvas.id}
                canvas={canvas}
                index={index + 1}
                scrollEnabled
                objectLinks={foundLinks}
              />
            );
          },
          "textual-content": ({ index, canvas, strategy }) => (
            <ScrollInfoBlock key={canvas.id} canvas={canvas} strategy={strategy} index={index + 1} scrollEnabled />
          ),
          media: ({ index, canvas, strategy }) => (
            <ScrollMediaBlock key={canvas.id} canvas={canvas} strategy={strategy} index={index + 1} scrollEnabled />
          ),
        }}
      </MapCanvasStrategy>
    </div>
  );
}
