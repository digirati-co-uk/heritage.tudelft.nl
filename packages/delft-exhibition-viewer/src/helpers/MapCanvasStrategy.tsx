import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { memo } from "react";
import { type RenderingStrategy, useCanvas, useStaticRenderingStrategy } from "react-iiif-vault";
import { MapCanvases, type MapCanvasesProps } from "./MapCanvases";

export interface MapCanvasStrategyProps<Enabled extends RenderingStrategy["type"] = RenderingStrategy["type"]>
  extends Omit<MapCanvasesProps, "children"> {
  themeProvider?: any;
  themeOptions?: any;
  children: {
    [K in Enabled]: ({
      index,
      canvas,
      strategy,
    }: {
      index: number;
      canvas: CanvasNormalized;
      strategy: RenderingStrategyByType[K];
    }) => React.ReactNode;
  } & {
    [K in Exclude<RenderingStrategy["type"], Enabled>]?: ({
      index,
      canvas,
      strategy,
    }: {
      index: number;
      canvas: CanvasNormalized;
      strategy: RenderingStrategyByType[K];
    }) => React.ReactNode;
  };
}

type RenderingStrategyByType = {
  [K in RenderingStrategy as K["type"]]: K;
};

export function MapCanvasStrategy<Enabled extends RenderingStrategy["type"] = RenderingStrategy["type"]>({
  children,
  themeProvider,
  themeOptions,
  ...props
}: MapCanvasStrategyProps<Enabled>) {
  return (
    <MapCanvases {...props}>
      {({ index }) => (
        <MapStrategyInner themeProvider={themeProvider} themeOptions={themeOptions} index={index}>
          {children as MapCanvasStrategyProps["children"]}
        </MapStrategyInner>
      )}
    </MapCanvases>
  );
}

export const MapStrategyInner = memo(function MapStrategyInner({
  index,
  themeProvider: ThemeProvider,
  themeOptions,
  children,
}: {
  index: number;
  children: MapCanvasStrategyProps["children"];
  themeOptions?: any;
  themeProvider?: any;
}) {
  const canvas = useCanvas();
  const strategy = useStaticRenderingStrategy();

  if (!canvas) return null;
  if (children[strategy.type]) {
    const toReturn = (children[strategy.type] as any)({ index, canvas, strategy });

    if (ThemeProvider) {
      return <ThemeProvider options={themeOptions}>{toReturn}</ThemeProvider>;
    }

    return toReturn;
  }
  return null;
});
