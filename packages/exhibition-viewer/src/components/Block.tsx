import { useRenderingStrategy } from "react-iiif-vault";
import { InfoBlock } from "./InfoBlock.tsx";
import { CanvasBlock } from "./CanvasBlock.tsx";

export function Block({ index }: { index: number }) {
  const [strategy] = useRenderingStrategy();

  if (strategy.type === "textual-content") {
    return <InfoBlock />;
  }

  return <CanvasBlock index={index} />;
}
