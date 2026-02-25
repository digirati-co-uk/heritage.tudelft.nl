import { LazyImage } from "./LazyImage";
import type { SiteFeaturedItem } from "./types";
import { getDiskPath, isAbsolutePath, toFileUrl } from "./utils";

export function FeaturedItemCard({
  debugBase,
  item,
}: {
  debugBase: string;
  item: SiteFeaturedItem;
}) {
  const diskPath = getDiskPath(item.source, item.diskPath);

  return (
    <article className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <a
        href={`${debugBase}/${item.slug}`}
        className="block hover:-translate-y-px transition-transform"
      >
        <div className="w-full aspect-[16/10] bg-slate-100 text-slate-500 flex items-center justify-center">
          {item.thumbnail ? (
            <LazyImage
              src={item.thumbnail}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>No image</span>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold">{item.label || "Untitled"}</h3>
          <p className="my-1 text-slate-500 font-mono text-xs">{item.slug}</p>
          <p className="text-slate-500 text-sm">
            {item.type || "Unknown"} · {item.source?.type || "unknown source"}
          </p>
        </div>
      </a>
      {diskPath ? (
        <div className="px-3 pb-3">
          {isAbsolutePath(diskPath) ? (
            <a
              className="block text-xs text-blue-700 underline font-mono truncate"
              href={toFileUrl(diskPath)}
              title={diskPath}
            >
              {diskPath}
            </a>
          ) : (
            <p
              className="text-xs text-slate-500 font-mono truncate"
              title={diskPath}
            >
              {diskPath}
            </p>
          )}
        </div>
      ) : null}
    </article>
  );
}
