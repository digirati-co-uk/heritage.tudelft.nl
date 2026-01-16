import { useThumbnail } from "react-iiif-vault";

export function BlurCanvasImage() {
  const thumbnail = useThumbnail({
    width: 256,
    height: 256,
  });

  if (!thumbnail) return null;

  return (
    <div className="absolute inset-0 z-10 overflow-hidden">
      <img className="w-full h-full object-cover blur-xl scale-110" src={thumbnail.id} alt="" />
    </div>
  );
}
