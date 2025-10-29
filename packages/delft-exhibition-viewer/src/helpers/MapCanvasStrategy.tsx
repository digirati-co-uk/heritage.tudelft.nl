import {
  useCanvas,
  useRenderingStrategy,
  type RenderingStrategy,
} from "react-iiif-vault";
import { MapCanvases, type MapCanvasesProps } from "./MapCanvases";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
type RenderingStrategyMappedByType = {
  [K in RenderingStrategy as K["type"]]: K;
};

export interface MapCanvasStrategyProps<
  Enabled extends RenderingStrategy["type"] = RenderingStrategy["type"],
> extends Omit<MapCanvasesProps, "children"> {
  children: {
    [K in Enabled]: ({
      index,
      canvas,
      strategy,
    }: {
      index: number;
      canvas: CanvasNormalized;
      strategy: RenderingStrategyMappedByType[K];
    }) => React.ReactNode;
  } & {
    [K in Exclude<RenderingStrategy["type"], Enabled>]?: ({
      index,
      canvas,
      strategy,
    }: {
      index: number;
      canvas: CanvasNormalized;
      strategy: RenderingStrategyMappedByType[K];
    }) => React.ReactNode;
  };
}

export function MapCanvasStrategy<
  Enabled extends RenderingStrategy["type"] = RenderingStrategy["type"],
>({ children, ...props }: MapCanvasStrategyProps<Enabled>) {
  return (
    <MapCanvases {...props}>
      {({ index }) => (
        <MapStrategyInner index={index}>{children as any}</MapStrategyInner>
      )}
    </MapCanvases>
  );
}

export function MapStrategyInner({
  index,
  children,
}: {
  index: number;
  children: MapCanvasStrategyProps["children"];
}) {
  const canvas = useCanvas();
  const [strategy] = useRenderingStrategy();

  if (!canvas) return null;
  if (children[strategy.type]) {
    return (children[strategy.type] as any)({ index, canvas, strategy });
  }
  return null;
}
