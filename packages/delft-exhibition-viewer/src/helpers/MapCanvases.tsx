import { AtlasContext } from "@atlas-viewer/atlas";
import { toRef } from "@iiif/parser";
import type { Canvas, Reference, SpecificResource } from "@iiif/presentation-3";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { Fragment, memo, useMemo } from "react";
import { AtlasStoreProvider, CanvasContext, useVault } from "react-iiif-vault";

export interface MapCanvasesProps {
  items: Array<CanvasNormalized | Canvas | SpecificResource<"Canvas"> | string | Reference<"Canvas">>;
  onlyCanvasId?: string;
  fallback?: React.ReactNode;
  children?: (data: {
    canvas: CanvasNormalized;
    index: number;
  }) => React.ReactNode;
}

function doCanvasPropsMatch(prevProps: MapCanvasesProps, nextProps: MapCanvasesProps) {
  if (prevProps.items === nextProps.items) {
    return true;
  }

  if (prevProps.items.length !== nextProps.items.length) {
    return false;
  }

  for (let i = 0; i < prevProps.items.length; i++) {
    const prevItem = prevProps.items[i];
    const nextItem = nextProps.items[i];
    if (prevItem !== nextItem) {
      return false;
    }
  }

  return true;
}

export const MapCanvases = memo(function MapCanvases(props: MapCanvasesProps) {
  const vault = useVault();
  const listOfIds = useMemo(() => {
    const list = [];
    for (const canvas of props.items) {
      const ref = toRef(canvas);
      if (ref?.id) {
        list.push(ref.id);
      }
    }
    return list;
  }, [props.items]);

  return listOfIds.map((id, index) => {
    const canvas = vault.get(id);
    if (!canvas) {
      return null;
    }
    if (props.onlyCanvasId && canvas.id !== props.onlyCanvasId) {
      return null;
    }

    let renderedChildren = null;
    try {
      renderedChildren = props.children ? props.children({ canvas, index }) : null;
    } catch (error: any) {
      if (process.env.NODE_ENV === "development" && !props.fallback) {
        return <div key={id}>{error?.message}</div>;
      }
      return <Fragment key={id}>{props.fallback || null}</Fragment>;
    }

    return (
      <CanvasContext canvas={id} key={id}>
        <AtlasStoreProvider name={id}>{renderedChildren}</AtlasStoreProvider>
      </CanvasContext>
    );
  });
}, doCanvasPropsMatch);
