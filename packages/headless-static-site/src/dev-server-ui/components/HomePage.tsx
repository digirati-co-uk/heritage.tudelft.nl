import { useEffect, useMemo, useState } from "react";
import { FeaturedItemCard } from "./FeaturedItemCard";
import { ResourceFilterTabs } from "./ResourceFilterTabs";
import type { ResourceFilter, SiteResponse } from "./types";
import { toResourceFilter } from "./utils";

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function shorten(value: string, max = 88) {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}…`;
}

export function HomePage({ debugBase }: { debugBase: string }) {
  const [site, setSite] = useState<SiteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>("all");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const pollSite = async () => {
      const response = await fetch(`${debugBase}/api/site`);
      if (!response.ok) {
        throw new Error(`Failed to load site data (${response.status})`);
      }
      const json = (await response.json()) as SiteResponse;
      if (cancelled) {
        return;
      }

      setSite(json);
      setError(null);

      const shouldKeepPolling =
        json.build?.status === "building" ||
        (json.build?.status === "idle" && (json.build?.buildCount || 0) === 0);
      if (shouldKeepPolling) {
        timer = setTimeout(pollSite, 1000);
      }
    };

    pollSite().catch((e) => {
      if (!cancelled) {
        setError(String(e));
      }
    });

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [debugBase]);

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      return;
    }

    const events = new EventSource(`${debugBase}/api/build-events`);
    const handleBuildEvent = (event: Event) => {
      const message = event as MessageEvent<string>;
      try {
        const build = JSON.parse(message.data) as SiteResponse["build"];
        setSite((current) => {
          if (!current) {
            return current;
          }
          return {
            ...current,
            build,
          };
        });
      } catch {
        // Ignore malformed debug stream messages.
      }
    };

    events.addEventListener("build", handleBuildEvent);
    return () => {
      events.removeEventListener("build", handleBuildEvent);
      events.close();
    };
  }, [debugBase]);

  const items = site?.featuredItems || null;
  const featured = useMemo(() => {
    if (!items) return [];
    return items
      .filter((item) => item.slug)
      .filter((item) => {
        if (resourceFilter === "all") return true;
        return toResourceFilter(item.type) === resourceFilter;
      })
      .filter((item) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
          (item.label || "").toLowerCase().includes(term) ||
          (item.slug || "").toLowerCase().includes(term)
        );
      });
  }, [items, resourceFilter, searchTerm]);

  const build = site?.build;
  const isBuilding =
    build &&
    (build.status === "building" ||
      (build.status === "idle" && (build.buildCount || 0) === 0));
  const resourcesTotal = build?.progress?.resources.total || 0;
  const resourcesProcessed = build?.progress?.resources.processed || 0;
  const resourcePercent =
    resourcesTotal > 0 ? (resourcesProcessed / resourcesTotal) * 100 : 0;
  const fetchQueued = build?.progress?.fetch.queued || 0;
  const fetchDone =
    (build?.progress?.fetch.completed || 0) +
    (build?.progress?.fetch.failed || 0);
  const fetchPercent = fetchQueued > 0 ? (fetchDone / fetchQueued) * 100 : 0;
  const progressPercent = clampPercent(
    resourcesTotal > 0 ? resourcePercent : fetchPercent,
  );

  if (error) return <p className="text-red-700">{error}</p>;
  if (!items) return <p>Loading site…</p>;

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
            placeholder="Search by label or slug"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
          <ResourceFilterTabs
            resourceFilter={resourceFilter}
            onChange={setResourceFilter}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">{featured.length} results</p>
      </section>

      {isBuilding ? (
        <section className="mt-4 border border-blue-200 bg-blue-50 rounded-xl p-4 mb-4">
          <p className="font-medium text-blue-900">Building IIIF resources…</p>
          <p className="text-blue-700 text-sm mt-1">
            {build?.progress?.message || "The first build is running."}
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded bg-blue-100">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-blue-800">
            {resourcesTotal > 0 ? (
              <p>
                Resources: {resourcesProcessed}/{resourcesTotal}
              </p>
            ) : null}
            {build?.progress?.fetch &&
            (fetchQueued > 0 ||
              build.progress.fetch.inFlight > 0 ||
              build.progress.fetch.cacheHits > 0) ? (
              <p>
                Remote fetches: {fetchDone}/{fetchQueued} complete
                {build.progress.fetch.inFlight
                  ? ` (${build.progress.fetch.inFlight} in flight)`
                  : ""}
                {build.progress.fetch.cacheHits
                  ? `, ${build.progress.fetch.cacheHits} cache hits`
                  : ""}
              </p>
            ) : null}
            {build?.progress?.resources.currentSlug ? (
              <p>
                Current resource:{" "}
                {shorten(build.progress.resources.currentSlug, 64)}
              </p>
            ) : null}
            {build?.progress?.fetch.currentUrl ? (
              <p>Current fetch: {shorten(build.progress.fetch.currentUrl)}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {featured.map((item) => (
          <FeaturedItemCard
            key={`${item.slug}-${item.id}`}
            debugBase={debugBase}
            item={item}
          />
        ))}
      </section>

      {site?.build?.status === "error" && site.build.lastError ? (
        <section className="mt-4 border border-red-200 bg-red-50 rounded-xl p-4">
          <p className="font-medium text-red-900">Build failed</p>
          <p className="text-red-700 text-sm mt-1">{site.build.lastError}</p>
        </section>
      ) : null}

      {!featured.length ? (
        <section className="mt-4 border border-dashed border-gray-300 bg-white rounded-xl p-4">
          {site?.onboarding?.enabled ? (
            <>
              <p className="font-medium">No IIIF content found yet.</p>
              <p className="mt-1 text-sm text-slate-600">
                {site.onboarding.hints?.addContent ||
                  `Add IIIF JSON files into ${site.onboarding.contentFolder || "./content"}.`}
              </p>
              <p className="mt-3 text-sm text-slate-700">
                Or configure remote URLs using plugin shorthand options:
              </p>
              <code className="mt-2 block rounded bg-slate-100 px-3 py-2 text-xs">
                {site.onboarding.hints?.astro ||
                  "iiif({ collection: 'https://example.org/iiif/collection.json' })"}
              </code>
              <code className="mt-2 block rounded bg-slate-100 px-3 py-2 text-xs">
                {site.onboarding.hints?.vite ||
                  "iiifPlugin({ collection: 'https://example.org/iiif/collection.json' })"}
              </code>
            </>
          ) : (
            <p>No featured items found in top-level collections yet.</p>
          )}
        </section>
      ) : null}
    </main>
  );
}
