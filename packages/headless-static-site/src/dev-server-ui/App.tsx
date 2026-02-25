import { useEffect, useMemo, useState } from "react";
import { LazyLoadComponent } from "react-lazy-load-image-component";
import { TracePage } from "./trace/TracePage";

type SiteResponse = {
  baseUrl: string;
  featuredItems: Array<{
    id: string | null;
    slug: string | null;
    label: string | null;
    thumbnail: string | null;
    type: string | null;
    source: any;
    diskPath: string | null;
  }>;
};

type ResourceResponse = {
  slug: string;
  type: "Manifest" | "Collection" | null;
  source: any;
  diskPath: string | null;
  isEditable: boolean;
  editablePath: string | null;
  resource: any;
  meta: Record<string, any>;
  indices: Record<string, any>;
  links: {
    json: string | null;
    localJson: string | null;
    remoteJson: string | null;
    manifestEditor: string | null;
    theseus: string | null;
  };
};

type CollectionItem = {
  id: string | null;
  type: string | null;
  slug: string;
  label: string;
  thumbnail: string | null;
};

type ResourceFilter = "all" | "manifest" | "collection";

function normalizeLabel(value: any) {
  if (!value) return "Untitled";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.find(Boolean) || "Untitled";
  for (const key of Object.keys(value)) {
    const candidate = value[key];
    if (Array.isArray(candidate) && candidate.length) {
      return candidate.find(Boolean) || "Untitled";
    }
  }
  return "Untitled";
}

function detectDebugBase(pathname: string) {
  const marker = "/_debug";
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex === -1) return marker;
  return pathname.slice(0, markerIndex + marker.length);
}

function getSlugPath(pathname: string, debugBase: string) {
  const relative = pathname.startsWith(debugBase)
    ? pathname.slice(debugBase.length)
    : pathname;
  const slug = relative.replace(/^\/+/, "").replace(/\/+$/, "");
  return decodeURIComponent(slug);
}

function encodeSlugPath(slug: string) {
  return slug
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function getThumbnailId(value: any): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === "string") return first;
    return first?.id || first?.["@id"] || null;
  }
  if (typeof value === "string") return value;
  return value?.id || value?.["@id"] || null;
}

function toResourceFilter(type: string | null): ResourceFilter {
  if (type === "Manifest") return "manifest";
  if (type === "Collection") return "collection";
  return "all";
}

function getDiskPath(
  source: any,
  diskPath?: string | null,
  editablePath?: string | null,
) {
  return diskPath || editablePath || source?.filePath || source?.path || null;
}

function isAbsolutePath(path: string) {
  return path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path);
}

function toFileUrl(path: string) {
  return `file://${encodeURI(path)}`;
}

function LazyImage({
  src,
  alt = "",
  className,
}: { src: string; alt?: string; className?: string }) {
  return (
    <LazyLoadComponent
      placeholder={<div className="w-full h-full bg-slate-100" />}
      visibleByDefault={false}
      threshold={300}
    >
      <img src={src} alt={alt} loading="lazy" className={className} />
    </LazyLoadComponent>
  );
}

function getMetaThumbnailId(meta: any): string | null {
  if (!meta || typeof meta !== "object") return null;
  const thumb = meta.thumbnail;
  if (!thumb || typeof thumb !== "object") return null;
  return thumb.id || thumb["@id"] || null;
}

function getCollectionItems(resource: any): CollectionItem[] {
  const items = Array.isArray(resource?.items) ? resource.items : [];
  return items
    .map((item: any) => {
      const slug = item?.["hss:slug"];
      if (!slug || typeof slug !== "string") return null;
      return {
        id: item?.id || null,
        type: item?.type || null,
        slug,
        label: normalizeLabel(item?.label),
        thumbnail: getThumbnailId(item?.thumbnail),
      } satisfies CollectionItem;
    })
    .filter((item): item is CollectionItem => Boolean(item));
}

function JsonPanel({ title, value }: { title: string; value: any }) {
  return (
    <details className="bg-white border border-gray-200 rounded-xl mb-3 p-3">
      <summary className="cursor-pointer font-semibold">{title}</summary>
      <pre className="mt-3 bg-slate-50 border border-gray-200 rounded-lg p-3 overflow-auto text-xs">
        {JSON.stringify(value || {}, null, 2)}
      </pre>
    </details>
  );
}

function Navigation({ debugBase }: { debugBase: string }) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
      <div>
        <h1 className="text-3xl font-semibold">IIIF Dev Server</h1>
        <p className="text-slate-500 mt-1">
          Debug-friendly browse and inspection UI
        </p>
      </div>
      <nav className="flex gap-2">
        <a
          className="border border-gray-200 rounded-lg bg-white px-3 py-2 text-sm hover:bg-slate-50"
          href={`${debugBase}/`}
        >
          Home
        </a>
        <a
          className="border border-gray-200 rounded-lg bg-white px-3 py-2 text-sm hover:bg-slate-50"
          href={`${debugBase}/trace`}
        >
          Trace
        </a>
      </nav>
    </header>
  );
}

function HomePage({ debugBase }: { debugBase: string }) {
  const [data, setData] = useState<SiteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>("all");

  useEffect(() => {
    let cancelled = false;
    fetch(`${debugBase}/api/site`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [debugBase]);

  if (error) return <p className="text-red-700">{error}</p>;
  if (!data) return <p>Loading site…</p>;

  const featured = data.featuredItems
    .filter((item) => item.slug)
    .filter((item) => {
      if (resourceFilter === "all") return true;
      return toResourceFilter(item.type) === resourceFilter;
    })
    .filter((item) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const diskPath = getDiskPath(item.source, item.diskPath);
      return (
        (item.label || "").toLowerCase().includes(term) ||
        (item.slug || "").toLowerCase().includes(term) ||
        (diskPath || "").toLowerCase().includes(term)
      );
    });

  return (
    <main>
      <section className="mb-4">
        <h2 className="text-2xl font-semibold">Browse</h2>
        <p className="text-slate-500">
          Top collection items with direct links to debug pages.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by label, slug, or disk path"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2">
            {(
              [
                { id: "all", label: "All" },
                { id: "manifest", label: "Manifests" },
                { id: "collection", label: "Collections" },
              ] as Array<{ id: ResourceFilter; label: string }>
            ).map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setResourceFilter(entry.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  resourceFilter === entry.id
                    ? "border-slate-800 bg-slate-900 text-white"
                    : "border-gray-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">{featured.length} results</p>
      </section>

      <section className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {featured.map((item) => {
          const diskPath = getDiskPath(item.source, item.diskPath);
          return (
            <article
              key={`${item.slug}-${item.id}`}
              className="border border-gray-200 rounded-xl bg-white overflow-hidden"
            >
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
                  <p className="my-1 text-slate-500 font-mono text-xs">
                    {item.slug}
                  </p>
                  <p className="text-slate-500 text-sm">
                    {item.type || "Unknown"} ·{" "}
                    {item.source?.type || "unknown source"}
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
        })}
      </section>

      {!featured.length ? (
        <section className="mt-4 border border-dashed border-gray-300 bg-white rounded-xl p-4">
          <p>No featured items found in top-level collections yet.</p>
        </section>
      ) : null}
    </main>
  );
}

function ResourcePage({
  debugBase,
  slug,
}: { debugBase: string; slug: string }) {
  const [data, setData] = useState<ResourceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${debugBase}/api/resource/${encodeSlugPath(slug)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [debugBase, slug]);

  if (error) return <p className="text-red-700">{error}</p>;
  if (!data) return <p>Loading resource…</p>;

  const title = normalizeLabel(data.resource?.label);
  const thumb =
    getMetaThumbnailId(data.meta) || getThumbnailId(data.resource?.thumbnail);
  const diskPath = getDiskPath(data.source, data.diskPath, data.editablePath);
  const isManifest = data.type === "Manifest";
  const collectionItems = getCollectionItems(data.resource);

  return (
    <main>
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

      <section>
        {data.type === "Collection" && collectionItems.length ? (
          <div className="bg-white border border-gray-200 rounded-xl mb-3 p-3">
            <h3 className="font-semibold mb-3">Collection Items</h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
              {collectionItems.map((item) => (
                <a
                  key={`${item.slug}-${item.id || ""}`}
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
                    <p className="my-1 text-slate-500 font-mono text-xs">
                      {item.slug}
                    </p>
                    <p className="text-slate-500 text-sm">
                      {item.type || "Unknown"}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ) : null}
        <JsonPanel title="IIIF Resource" value={data.resource} />
        <JsonPanel title="meta.json" value={data.meta} />
        <JsonPanel title="indices.json" value={data.indices} />
      </section>
    </main>
  );
}

function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [trace, setTrace] = useState<any>(null);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const debugBase = useMemo(() => detectDebugBase(pathname), [pathname]);
  const slugPath = useMemo(
    () => getSlugPath(pathname, debugBase),
    [debugBase, pathname],
  );
  const isHome = !slugPath;
  const isTrace = slugPath === "trace";

  useEffect(() => {
    if (!isTrace) return;
    let cancelled = false;
    fetch(`${debugBase}/api/trace`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setTrace(json);
      })
      .catch(() => {
        if (!cancelled) setTrace({});
      });
    return () => {
      cancelled = true;
    };
  }, [debugBase, isTrace]);

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      <Navigation debugBase={debugBase} />
      {isHome ? <HomePage debugBase={debugBase} /> : null}
      {isTrace ? (
        trace ? (
          <TracePage trace={trace} debugBase={debugBase} />
        ) : (
          <p>Loading trace…</p>
        )
      ) : null}
      {!isHome && !isTrace ? (
        <ResourcePage debugBase={debugBase} slug={slugPath} />
      ) : null}
    </div>
  );
}

export default App;
