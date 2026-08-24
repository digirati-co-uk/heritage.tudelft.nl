import { useEffect, useMemo, useState } from "react";
import { Pagination } from "./Pagination";
import { usePaginateArray } from "./use-paginated-array";

type TraceJson = {
  enrichments: Record<
    string,
    { startTime: number; endTime: number; totalTime: number; count: number }
  >;
  extractions: Record<
    string,
    { startTime: number; endTime: number; totalTime: number; count: number }
  >;
  resources: Record<
    string,
    {
      label: any;
      thumbnail: string | null;
      extractionStart: number;
      extractionEnd: number;
      extractions: Record<
        string,
        | { start: number; end: number; result: any; cacheHit: false }
        | { cacheHit: true }
      >;
      enrichmentStart: number;
      enrichmentEnd: number;
      enrichments: Record<
        string,
        | { start: number; end: number; result: any; cacheHit: false }
        | { cacheHit: true }
      >;
      files: string[];
      withinCollections: string[];
    }
  >;
  topics: Record<
    string,
    {
      meta: any;
      yaml: { path: string; data: any } | null;
    }
  >;
};

type ResourceDebugResponse = {
  slug: string;
  type: "Manifest" | "Collection" | null;
  resource: any;
  meta: Record<string, any> | null;
  indices: Record<string, any> | null;
  links?: {
    json?: string | null;
    manifestEditor?: string | null;
    theseus?: string | null;
  };
};

function renderLabel(value: any): string {
  if (!value) return "Untitled";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.find(Boolean) || "Untitled";
  if (value.en?.length) return value.en[0];
  if (value.none?.length) return value.none[0];
  for (const key of Object.keys(value)) {
    if (Array.isArray(value[key]) && value[key].length) return value[key][0];
  }
  return "Untitled";
}

function getThumbnailId(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === "string") return first;
    return first?.id || first?.["@id"] || null;
  }
  return value?.id || value?.["@id"] || null;
}

function encodeSlugPath(slug: string) {
  return slug
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function formatTime(ms: number): string {
  if (ms < 1) return `${ms.toFixed(2)}ms`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function OverviewStats({ trace }: { trace: TraceJson }) {
  const stats = useMemo(() => {
    const totalEnrichmentTime = Object.values(trace.enrichments || {}).reduce(
      (sum, e) => sum + e.totalTime,
      0,
    );
    const totalExtractionTime = Object.values(trace.extractions || {}).reduce(
      (sum, e) => sum + e.totalTime,
      0,
    );
    const totalEnrichmentRuns = Object.values(trace.enrichments || {}).reduce(
      (sum, e) => sum + e.count,
      0,
    );
    const totalExtractionRuns = Object.values(trace.extractions || {}).reduce(
      (sum, e) => sum + e.count,
      0,
    );

    return {
      totalEnrichmentTime,
      totalExtractionTime,
      totalEnrichmentRuns,
      totalExtractionRuns,
      resourceCount: Object.keys(trace.resources || {}).length,
      topicCount: Object.keys(trace.topics || {}).length,
      uniqueEnrichments: Object.keys(trace.enrichments || {}).length,
      uniqueExtractions: Object.keys(trace.extractions || {}).length,
    };
  }, [trace]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-3xl font-bold text-blue-600">
            {stats.resourceCount}
          </div>
          <div className="text-sm text-gray-600">Resources</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-3xl font-bold text-green-600">
            {stats.uniqueEnrichments}
          </div>
          <div className="text-sm text-gray-600">Enrichments</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-3xl font-bold text-purple-600">
            {stats.uniqueExtractions}
          </div>
          <div className="text-sm text-gray-600">Extractions</div>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <div className="text-3xl font-bold text-orange-600">
            {stats.topicCount}
          </div>
          <div className="text-sm text-gray-600">Topics</div>
        </div>
      </div>
    </div>
  );
}

function TimingTable({
  title,
  data,
  colorClass,
}: {
  title: string;
  data: Record<
    string,
    { startTime: number; endTime: number; totalTime: number; count: number }
  >;
  colorClass: string;
}) {
  const sorted = useMemo(() => {
    return Object.entries(data || {})
      .sort(([, a], [, b]) => b.totalTime - a.totalTime)
      .slice(0, 20);
  }, [data]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Step
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Total
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Runs
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Avg
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sorted.map(([key, row]) => (
              <tr key={key}>
                <td className="px-4 py-4 text-sm text-gray-900 font-mono">
                  {key.length > 80 ? `${key.slice(0, 80)}...` : key}
                </td>
                <td className={`px-4 py-4 text-sm font-mono ${colorClass}`}>
                  {formatTime(row.totalTime)}
                </td>
                <td className="px-4 py-4 text-sm font-mono text-gray-600">
                  {row.count}
                </td>
                <td className="px-4 py-4 text-sm font-mono text-blue-600">
                  {formatTime(row.totalTime / Math.max(1, row.count))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExecutionItem({
  name,
  details,
}: {
  name: string;
  details:
    | { start: number; end: number; result: any; cacheHit: false }
    | { cacheHit: true };
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isCache = details.cacheHit === true;
  const duration = isCache ? 0 : (details as any).end - (details as any).start;

  return (
    <div className="text-sm">
      <button
        type="button"
        className="w-full text-left flex justify-between items-start"
        onClick={() => setIsOpen((v) => !v)}
      >
        <span className="font-mono text-xs flex-1">
          {name.length > 60 ? `${name.slice(0, 60)}...` : name}
        </span>
        <span className="ml-2 font-mono text-xs">
          {isCache ? (
            <span className="text-yellow-700 bg-yellow-100 px-1 rounded">
              CACHE
            </span>
          ) : (
            <span className="text-purple-600">{formatTime(duration)}</span>
          )}
        </span>
      </button>
      {isOpen && !isCache ? (
        <pre className="mt-2 bg-slate-900 text-slate-100 p-2 rounded-md text-xs overflow-auto">
          {JSON.stringify((details as any).result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function ManifestDebug({
  debugBase,
  slug,
}: { debugBase: string; slug: string }) {
  const [data, setData] = useState<ResourceDebugResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetch(`${debugBase}/api/resource/${encodeSlugPath(slug)}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load debug resource (${response.status})`);
        }
        return response.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [debugBase, slug]);

  if (error) {
    return (
      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-600">
        Loading resource debug data...
      </div>
    );
  }

  const thumb =
    getThumbnailId((data.meta as any)?.thumbnail) ||
    getThumbnailId(data.resource?.thumbnail);

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="h-20 w-20 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
          {thumb ? (
            <img
              src={thumb}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="text-sm text-gray-500">{data.type || "Resource"}</div>
          <div className="font-semibold text-gray-900">
            {renderLabel(data.resource?.label)}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <a
              className="text-blue-700 underline"
              href={`${debugBase}/${encodeSlugPath(slug)}`}
            >
              Open debug page
            </a>
            {data.links?.json ? (
              <a
                className="text-blue-700 underline"
                href={data.links.json}
                target="_blank"
                rel="noreferrer"
              >
                Open JSON
              </a>
            ) : null}
            {data.links?.manifestEditor ? (
              <a
                className="text-blue-700 underline"
                href={data.links.manifestEditor}
                target="_blank"
                rel="noreferrer"
              >
                Edit Manifest
              </a>
            ) : null}
            {data.links?.theseus ? (
              <a
                className="text-blue-700 underline"
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
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <details className="rounded-md border border-gray-200 bg-gray-50 p-2">
          <summary className="cursor-pointer font-medium text-gray-800">
            meta.json
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto text-xs text-gray-700">
            {JSON.stringify(data.meta || {}, null, 2)}
          </pre>
        </details>
        <details className="rounded-md border border-gray-200 bg-gray-50 p-2">
          <summary className="cursor-pointer font-medium text-gray-800">
            indices.json
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto text-xs text-gray-700">
            {JSON.stringify(data.indices || {}, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

function ResourceDetails({
  trace,
  debugBase,
}: { trace: TraceJson; debugBase: string }) {
  const [expandedResource, setExpandedResource] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const sortedResources = useMemo(() => {
    return Object.entries(trace.resources || {})
      .map(([slug, resource]) => {
        const totalExtractionTime =
          resource.extractionEnd - resource.extractionStart;
        const totalEnrichmentTime =
          resource.enrichmentEnd - resource.enrichmentStart;
        return {
          slug,
          resource,
          totalTime: totalExtractionTime + totalEnrichmentTime,
          totalExtractionTime,
          totalEnrichmentTime,
        };
      })
      .filter(({ slug, resource }) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          slug.toLowerCase().includes(term) ||
          renderLabel(resource.label).toLowerCase().includes(term)
        );
      })
      .sort((a, b) => b.totalTime - a.totalTime);
  }, [trace.resources, searchTerm]);

  const [resources, pager] = usePaginateArray(sortedResources, {
    pageSize: 50,
    page,
    setPage,
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-6" ref={pager.topRef}>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Resources (by total processing time)
      </h2>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search resources by label or slug"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
        />
      </div>

      <div className="space-y-4">
        <Pagination
          page={pager.currentPage || 1}
          customPagingFn={pager.goToPage}
          total={pager.totalItems}
          pageSize={pager.pageSize}
          totalPages={pager.totalPages}
        />
        {resources.map(
          ({
            slug,
            resource,
            totalTime,
            totalExtractionTime,
            totalEnrichmentTime,
          }) => (
            <div key={slug} className="border border-gray-200 rounded-lg">
              <button
                type="button"
                className="p-4 w-full text-left hover:bg-gray-50 flex justify-between items-center"
                onClick={() =>
                  setExpandedResource(expandedResource === slug ? null : slug)
                }
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    {renderLabel(resource.label)}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
                    <span className="font-mono">{slug}</span>
                    <span>Total: {formatTime(totalTime)}</span>
                    <span>Extractions: {formatTime(totalExtractionTime)}</span>
                    <span>Enrichments: {formatTime(totalEnrichmentTime)}</span>
                  </div>
                </div>
                <div className="text-gray-400">
                  {expandedResource === slug ? "−" : "+"}
                </div>
              </button>

              {expandedResource === slug ? (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <ManifestDebug debugBase={debugBase} slug={slug} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Extractions
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(resource.extractions || {}).map(
                          ([key, details]) => (
                            <ExecutionItem
                              key={key}
                              name={key}
                              details={details}
                            />
                          ),
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Enrichments
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(resource.enrichments || {}).map(
                          ([key, details]) => (
                            <ExecutionItem
                              key={key}
                              name={key}
                              details={details}
                            />
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                  {resource.files?.length ? (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Files ({resource.files.length})
                      </h4>
                      <div className="grid gap-1 md:grid-cols-2">
                        {resource.files.map((file) => (
                          <div
                            key={file}
                            className="font-mono text-xs text-gray-600 truncate"
                          >
                            {file}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {resource.withinCollections?.length ? (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Collections
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {resource.withinCollections.map((collection) => (
                          <span
                            key={collection}
                            className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800"
                          >
                            {collection}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ),
        )}
        <Pagination
          page={pager.currentPage || 1}
          customPagingFn={pager.goToPage}
          total={pager.totalItems}
          pageSize={pager.pageSize}
          totalPages={pager.totalPages}
        />
      </div>
    </div>
  );
}

export function TracePage({
  trace,
  debugBase,
}: { trace: TraceJson; debugBase: string }) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "enrichments" | "extractions" | "resources"
  >("overview");

  return (
    <div className="min-h-screen py-8 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Trace Analysis</h1>
          <p className="text-gray-600 mt-2">
            Performance analysis and debugging information
          </p>
        </div>

        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { key: "overview", label: "Overview" },
              { key: "enrichments", label: "Enrichments" },
              { key: "extractions", label: "Extractions" },
              { key: "resources", label: "Resources" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "overview" ? <OverviewStats trace={trace} /> : null}
        {activeTab === "enrichments" ? (
          <TimingTable
            title="Top Enrichments (by total time)"
            data={trace.enrichments || {}}
            colorClass="text-green-600"
          />
        ) : null}
        {activeTab === "extractions" ? (
          <TimingTable
            title="Top Extractions (by total time)"
            data={trace.extractions || {}}
            colorClass="text-purple-600"
          />
        ) : null}
        {activeTab === "resources" ? (
          <ResourceDetails trace={trace} debugBase={debugBase} />
        ) : null}
      </div>
    </div>
  );
}
