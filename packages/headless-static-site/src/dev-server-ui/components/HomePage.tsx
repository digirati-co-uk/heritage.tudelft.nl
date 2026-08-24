import { useEffect, useMemo, useState } from "react";
import { FeaturedItemCard } from "./FeaturedItemCard";
import { ResourceFilterTabs } from "./ResourceFilterTabs";
import type { ResourceFilter, SiteResponse } from "./types";
import { toResourceFilter } from "./utils";

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

      <section className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {featured.map((item) => (
          <FeaturedItemCard
            key={`${item.slug}-${item.id}`}
            debugBase={debugBase}
            item={item}
          />
        ))}
      </section>

      {site?.build &&
      (site.build.status === "building" ||
        (site.build.status === "idle" &&
          (site.build.buildCount || 0) === 0)) ? (
        <section className="mt-4 border border-blue-200 bg-blue-50 rounded-xl p-4">
          <p className="font-medium text-blue-900">Building IIIF resources…</p>
          <p className="text-blue-700 text-sm mt-1">
            The debug UI will refresh automatically when the initial build is
            ready.
          </p>
        </section>
      ) : null}

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
