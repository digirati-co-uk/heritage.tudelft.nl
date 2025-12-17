"use client";
import { usePaginateArray } from "@/hooks/use-paginated-array";
import { Link } from "@/i18n/navigation";
import { IIIF_URL } from "@/iiif.client";
import type { InternationalString } from "@iiif/presentation-3";
import { useQuery } from "@tanstack/react-query";
import React, { useState, useMemo } from "react";
import { Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import { LocaleString } from "react-iiif-vault";
import { NextPagination } from "../atoms/NextPagination";

type TraceJson = {
  enrichments: Record<string, { startTime: number; endTime: number; totalTime: number; count: number }>;
  extractions: Record<string, { startTime: number; endTime: number; totalTime: number; count: number }>;
  resources: Record<
    string,
    {
      label: InternationalString;
      thumbnail: string | null;
      extractionStart: number;
      extractionEnd: number;
      extractions: Record<string, { start: number; end: number; result: any; cacheHit: false } | { cacheHit: true }>;
      enrichmentStart: number;
      enrichmentEnd: number;
      enrichments: Record<string, { start: number; end: number; result: any; cacheHit: false } | { cacheHit: true }>;
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

function formatTime(ms: number): string {
  if (ms < 1) return `${ms.toFixed(2)}ms`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function OverviewStats({ trace }: { trace: TraceJson }) {
  const stats = useMemo(() => {
    const totalEnrichmentTime = Object.values(trace.enrichments).reduce((sum, e) => sum + e.totalTime, 0);
    const totalExtractionTime = Object.values(trace.extractions).reduce((sum, e) => sum + e.totalTime, 0);
    const totalEnrichmentRuns = Object.values(trace.enrichments).reduce((sum, e) => sum + e.count, 0);
    const totalExtractionRuns = Object.values(trace.extractions).reduce((sum, e) => sum + e.count, 0);

    return {
      totalEnrichmentTime,
      totalExtractionTime,
      totalEnrichmentRuns,
      totalExtractionRuns,
      resourceCount: Object.keys(trace.resources).length,
      topicCount: Object.keys(trace.topics).length,
      uniqueEnrichments: Object.keys(trace.enrichments).length,
      uniqueExtractions: Object.keys(trace.extractions).length,
    };
  }, [trace]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-3xl font-bold text-blue-600">{stats.resourceCount}</div>
          <div className="text-sm text-gray-600">Resources</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-3xl font-bold text-green-600">{stats.uniqueEnrichments}</div>
          <div className="text-sm text-gray-600">Enrichments</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-3xl font-bold text-purple-600">{stats.uniqueExtractions}</div>
          <div className="text-sm text-gray-600">Extractions</div>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <div className="text-3xl font-bold text-orange-600">{stats.topicCount}</div>
          <div className="text-sm text-gray-600">Topics</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Enrichment Performance</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Time:</span>
              <span className="font-mono">{formatTime(stats.totalEnrichmentTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Runs:</span>
              <span className="font-mono">{stats.totalEnrichmentRuns}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg per Run:</span>
              <span className="font-mono">
                {stats.totalEnrichmentRuns > 0
                  ? formatTime(stats.totalEnrichmentTime / stats.totalEnrichmentRuns)
                  : "0ms"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Extraction Performance</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Time:</span>
              <span className="font-mono">{formatTime(stats.totalExtractionTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Runs:</span>
              <span className="font-mono">{stats.totalExtractionRuns}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg per Run:</span>
              <span className="font-mono">
                {stats.totalExtractionRuns > 0
                  ? formatTime(stats.totalExtractionTime / stats.totalExtractionRuns)
                  : "0ms"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EnrichmentsList({ trace }: { trace: TraceJson }) {
  const sortedEnrichments = useMemo(() => {
    return Object.entries(trace.enrichments)
      .sort(([, a], [, b]) => b.totalTime - a.totalTime)
      .slice(0, 10);
  }, [trace.enrichments]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Top Enrichments (by total time)</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Enrichment
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time (real)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Runs</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Time
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedEnrichments.map(([key, data]) => (
              <tr key={key}>
                <td className="px-4 py-4 text-sm text-gray-900 font-mono">
                  {key.length > 60 ? `${key.slice(0, 60)}...` : key}
                </td>
                <td className="px-4 py-4 text-sm font-mono text-green-600">{formatTime(data.totalTime)}</td>
                <td className="px-4 py-4 text-sm font-mono text-green-600">
                  {formatTime(data.endTime - data.startTime)}
                </td>
                <td className="px-4 py-4 text-sm font-mono text-gray-600">{data.count}</td>
                <td className="px-4 py-4 text-sm font-mono text-blue-600">{formatTime(data.totalTime / data.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExtractionsList({ trace }: { trace: TraceJson }) {
  const sortedExtractions = useMemo(() => {
    return Object.entries(trace.extractions)
      .sort(([, a], [, b]) => b.totalTime - a.totalTime)
      .slice(0, 10);
  }, [trace.extractions]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Top Extractions (by total time)</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Extraction
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time (real)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Runs</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Time
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedExtractions.map(([key, data]) => (
              <tr key={key}>
                <td className="px-4 py-4 text-sm text-gray-900 font-mono">
                  {key.length > 60 ? `${key.slice(0, 60)}...` : key}
                </td>
                <td className="px-4 py-4 text-sm font-mono text-purple-600">{formatTime(data.totalTime)}</td>
                <td className="px-4 py-4 text-sm font-mono text-green-600">
                  {formatTime(data.endTime - data.startTime)}
                </td>
                <td className="px-4 py-4 text-sm font-mono text-gray-600">{data.count}</td>
                <td className="px-4 py-4 text-sm font-mono text-blue-600">{formatTime(data.totalTime / data.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResourceDetails({ trace }: { trace: TraceJson }) {
  const [expandedResource, setExpandedResource] = useState<string | null>(null);

  const sortedResources = useMemo(() => {
    return Object.entries(trace.resources)
      .map(([slug, resource]) => {
        const totalExtractionTime = resource.extractionEnd - resource.extractionStart;
        const totalEnrichmentTime = resource.enrichmentEnd - resource.enrichmentStart;
        const totalTime = totalExtractionTime + totalEnrichmentTime;

        return { slug, resource, totalTime, totalExtractionTime, totalEnrichmentTime };
      })
      .sort((a, b) => b.totalTime - a.totalTime);
  }, [trace.resources]);

  const [page, setPage] = useState(1);
  const [resources, { topRef, totalPages, totalItems, pageSize, currentPage, goToPage }] = usePaginateArray(
    sortedResources,
    {
      pageSize: 100,
      page,
      setPage,
    },
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6" ref={topRef}>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Resources (by total processing time)</h2>
      <div className="space-y-4">
        <NextPagination
          page={currentPage || 1}
          customPagingFn={(page) => {
            console.log(page);
            goToPage(page);
          }}
          total={totalItems}
          pageSize={pageSize}
          totalPages={totalPages}
        />
        {resources.map(({ slug, resource, totalTime, totalExtractionTime, totalEnrichmentTime }) => (
          <div key={slug} className="border border-gray-200 rounded-lg">
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-center"
              onClick={() => setExpandedResource(expandedResource === slug ? null : slug)}
            >
              <div className="flex-1">
                <LocaleString className="font-semibold text-gray-900">{resource.label}</LocaleString>
                <div className="flex gap-4 text-sm text-gray-600 mt-1">
                  <Link href={`/${slug.replace("manifests/", "objects/")}`} className="text-gray-400 text-sm underline">
                    {slug}
                  </Link>
                  <span>Total: {formatTime(totalTime)}</span>
                  <span>Extractions: {formatTime(totalExtractionTime)}</span>
                  <span>Enrichments: {formatTime(totalEnrichmentTime)}</span>
                  <span>{resource.files.length} files</span>
                  {resource.withinCollections.length > 0 && (
                    <span>{resource.withinCollections.length} collections</span>
                  )}
                </div>
              </div>
              <div className="text-gray-400">{expandedResource === slug ? "−" : "+"}</div>
            </div>

            {expandedResource === slug && (
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <ManifestDetails slug={slug} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Extractions</h4>
                    <div className="space-y-2">
                      {Object.entries(resource.extractions).map(([key, extraction]) => (
                        <ExtractionDetail key={key} name={key} extraction={extraction} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Enrichments</h4>
                    <div className="space-y-2">
                      {Object.entries(resource.enrichments).map(([key, enrichment]) => (
                        <div key={key} className="text-sm">
                          <div className="flex justify-between items-start">
                            <span className="font-mono text-xs text-gray-600 flex-1">
                              {key.length > 40 ? `${key.slice(0, 40)}...` : key}
                            </span>
                            <span className="ml-2 font-mono text-xs">
                              {enrichment.cacheHit ? (
                                <span className="text-yellow-600 bg-yellow-100 px-1 rounded">CACHE</span>
                              ) : (
                                <span className="text-green-600">{formatTime(enrichment.end - enrichment.start)}</span>
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {resource.files.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Files ({resource.files.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
                      {resource.files.map((file, i) => (
                        <div key={i} className="text-xs font-mono text-gray-600 truncate">
                          {file}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {resource.withinCollections.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Collections</h4>
                    <div className="flex flex-wrap gap-2">
                      {resource.withinCollections.map((collection, i) => (
                        <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {collection}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <NextPagination
          page={currentPage || 1}
          customPagingFn={goToPage}
          total={totalItems}
          pageSize={pageSize}
          totalPages={totalPages}
        />
      </div>
    </div>
  );
}

function ExtractionDetail({
  name,
  extraction,
}: { name: string; extraction: TraceJson["resources"][string]["extractions"][string] }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="text-sm">
      <div className="flex justify-between hover items-start cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <span className="font-mono text-xs hover:bg-slate-200 flex-1">
          {name.length > 40 ? `${name.slice(0, 40)}...` : name}
        </span>
        <span className="ml-2 font-mono text-xs">
          {extraction.cacheHit ? (
            <span className="text-yellow-600 bg-yellow-100 px-1 rounded">CACHE</span>
          ) : (
            <span className="text-purple-600">{formatTime(extraction.end - extraction.start)}</span>
          )}
        </span>
      </div>
      {isOpen && !extraction.cacheHit && (
        <div className="mt-2">
          <pre className="font-mono text-xs text-white bg-slate-800 max-w-full overflow-auto">
            {JSON.stringify(extraction.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function ManifestDetails({ slug }: { slug: string }) {
  const { data } = useQuery({
    queryKey: ["manifests-json", slug],
    queryFn: async () => {
      return {
        manifest: await fetch(`${IIIF_URL}${slug}/manifest.json`)
          .then((r) => r.json() as any)
          .catch(() => ({})),
        meta: await fetch(`${IIIF_URL}${slug}/meta.json`)
          .then((r) => r.json() as any)
          .catch(() => ({})),
        indices: await fetch(`${IIIF_URL}${slug}/indices.json`)
          .then((r) => r.json() as any)
          .catch(() => ({})),
        searchRecord: await fetch(`${IIIF_URL}${slug}/search-record.json`)
          .then((r) => r.json() as any)
          .catch(() => ({})),
      };
    },
  });

  if (!data) return null;

  return (
    <>
      <div className="flex items-center gap-4 mb-2">
        {data.meta.thumbnail ? (
          <div className="w-24 h-24 rounded-md object-contain bg-black overflow-hidden">
            <img src={data.meta.thumbnail.id} />
          </div>
        ) : null}
        <div className="flex flex-col">
          <LocaleString className="text-xl font-bold">{data.manifest.label}</LocaleString>
          <div className="flex items-center gap-2">
            <Link className="underline" href={`/${slug.replace("manifests/", "objects/")}`}>
              View Resource
            </Link>
            <Link className="underline" href={`${IIIF_URL}${slug}/manifest.json`}>
              Manifest URL
            </Link>
            <Link className="underline" href={`${IIIF_URL}${slug}/search-record.json`}>
              Search Record URL
            </Link>
            <Link className="underline" href={`${IIIF_URL}${slug}/meta.json`}>
              Metadata file
            </Link>
          </div>
        </div>
      </div>
      <Tabs className="mb-8">
        <TabList className="flex flex-wrap gap-2 bg-gray-100 p-2 pb-0">
          <Tab className="bg-gray-50 data-[selected=true]:bg-gray-700 data-[selected=true]:text-white p-2" id="meta">
            meta.json
          </Tab>
          <Tab className="bg-gray-50 data-[selected=true]:bg-gray-700 data-[selected=true]:text-white p-2" id="indices">
            indices.json
          </Tab>
          <Tab
            className="bg-gray-50 data-[selected=true]:bg-gray-700 data-[selected=true]:text-white p-2"
            id="manifest"
          >
            manifest.json
          </Tab>
          <Tab
            className="bg-gray-50 data-[selected=true]:bg-gray-700 data-[selected=true]:text-white p-2"
            id="search-record"
          >
            search-record.json
          </Tab>
        </TabList>
        <TabPanel id="meta">
          <pre className="bg-gray-800 text-white p-4 text-xs max-h-96 overflow-auto">
            {JSON.stringify(data.meta, null, 2)}
          </pre>
        </TabPanel>
        <TabPanel id="indices">
          <pre className="bg-gray-800 text-white p-4 text-xs max-h-96 overflow-auto">
            {JSON.stringify(data.indices, null, 2)}
          </pre>
        </TabPanel>
        <TabPanel id="manifest">
          <pre className="bg-gray-800 text-white p-4 text-xs max-h-96 overflow-auto">
            {JSON.stringify(data.manifest, null, 2)}
          </pre>
        </TabPanel>
        <TabPanel id="search-record">
          <pre className="bg-gray-800 text-white p-4 text-xs max-h-96 overflow-auto">
            {JSON.stringify(data.searchRecord, null, 2)}
          </pre>
        </TabPanel>
      </Tabs>
    </>
  );
}

export function TracePage({ trace }: { trace: TraceJson }) {
  const [activeTab, setActiveTab] = useState<"overview" | "enrichments" | "extractions" | "resources">("overview");

  return (
    <div className="min-h-screen bg-gray-100 py-8 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Trace Analysis</h1>
          <p className="text-gray-600 mt-2">Performance analysis and debugging information</p>
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

        {activeTab === "overview" && <OverviewStats trace={trace} />}
        {activeTab === "enrichments" && <EnrichmentsList trace={trace} />}
        {activeTab === "extractions" && <ExtractionsList trace={trace} />}
        {activeTab === "resources" && <ResourceDetails trace={trace} />}
      </div>
    </div>
  );
}
