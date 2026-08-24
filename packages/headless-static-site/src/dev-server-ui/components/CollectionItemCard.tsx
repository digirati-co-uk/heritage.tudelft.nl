import { LazyImage } from "./LazyImage";
import type { CollectionItem } from "./types";

export function CollectionItemCard({
  debugBase,
  item,
}: {
  debugBase: string;
  item: CollectionItem;
}) {
  return (
    <a
      href={`${debugBase}/${item.slug}`}
      className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:bg-slate-50"
    >
      <div className="w-full aspect-[4/3] bg-slate-100 text-slate-500 flex items-center justify-center">
        {item.thumbnail ? (
          <LazyImage
            src={item.thumbnail}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span>No image</span>
        )}
      </div>
      <div className="p-3">
        <h4 className="font-semibold text-sm">{item.label}</h4>
        <p className="my-1 text-slate-500 font-mono text-xs">{item.slug}</p>
        <p className="text-slate-500 text-sm">{item.type || "Unknown"}</p>
      </div>
    </a>
  );
}
