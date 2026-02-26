import { LazyImage } from "./LazyImage";
import type { ResourceResponse } from "./types";
import {
  getDiskPath,
  isAbsolutePath,
  normalizeLabel,
  toFileUrl,
} from "./utils";

export function ResourceSummaryCard({
  data,
  thumb,
}: {
  data: ResourceResponse;
  thumb: string | null;
}) {
  const title = normalizeLabel(data.resource?.label);
  const diskPath = getDiskPath(data.source, data.diskPath, data.editablePath);
  const isManifest = data.type === "Manifest";

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="w-full md:w-[260px] md:min-w-[260px] aspect-[4/3] rounded-xl border border-gray-200 overflow-hidden bg-slate-100 flex items-center justify-center text-slate-500">
          {thumb ? (
            <LazyImage
              src={thumb}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span>No image</span>
          )}
        </div>
        <div>
          <p className="text-sm text-slate-500">{data.type || "Unknown"}</p>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="my-1 text-slate-500 font-mono text-xs">{data.slug}</p>
          <p className="text-slate-500 text-sm">
            Source: {data.source?.type || "unknown"}
            {data.source?.url ? ` (${data.source.url})` : ""}
          </p>
          {diskPath ? (
            <p className="text-slate-500 text-xs font-mono mt-1">
              Path:{" "}
              {isAbsolutePath(diskPath) ? (
                <a
                  className="underline text-blue-700"
                  href={toFileUrl(diskPath)}
                >
                  {diskPath}
                </a>
              ) : (
                diskPath
              )}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 mt-3">
            {data.links.json ? (
              <a
                className="border border-gray-300 bg-white px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50"
                href={data.links.json}
                target="_blank"
                rel="noreferrer"
              >
                Open JSON
              </a>
            ) : null}
            {isManifest && data.links.manifestEditor ? (
              <a
                className="border border-gray-300 bg-white px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50"
                href={data.links.manifestEditor}
                target="_blank"
                rel="noreferrer"
              >
                Edit Manifest
              </a>
            ) : null}
            {data.links.theseus ? (
              <a
                className="border border-gray-300 bg-white px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50"
                href={data.links.theseus}
                target="_blank"
                rel="noreferrer"
              >
                Open in Theseus
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
