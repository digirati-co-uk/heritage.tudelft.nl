import { useEffect, useMemo, useState } from "react";
import { FeaturedItemCard } from "./FeaturedItemCard";
import { ResourceFilterTabs } from "./ResourceFilterTabs";
import type { ResourceFilter, SiteFeaturedItem } from "./types";
import { getCollectionItems, toResourceFilter } from "./utils";

function getSiteBasePath(debugBase: string) {
  const marker = "/_debug";
  const markerIndex = debugBase.indexOf(marker);
  if (markerIndex === -1) {
    return "";
  }
  return debugBase.slice(0, markerIndex);
}

function toFeaturedItems(collection: any): SiteFeaturedItem[] {
  return getCollectionItems(collection).map((item) => ({
    id: item.id,
    slug: item.slug,
    label: item.label,
    thumbnail: item.thumbnail,
    type: item.type,
    source: null,
    diskPath: null,
  }));
}

export function HomePage({ debugBase }: { debugBase: string }) {
  const [items, setItems] = useState<SiteFeaturedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>("all");

  useEffect(() => {
    let cancelled = false;
    const siteBasePath = getSiteBasePath(debugBase);
    const topCollectionUrl = `${siteBasePath}/collection.json`;
    const manifestsCollectionUrl = `${siteBasePath}/manifests/collection.json`;

    const tryLoadCollection = async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }
      return toFeaturedItems(await response.json());
    };

    Promise.all([tryLoadCollection(topCollectionUrl), tryLoadCollection(manifestsCollectionUrl)])
      .then(([topItems, manifestItems]) => {
        if (cancelled) {
          return;
        }
        if (!topItems && !manifestItems) {
          setError(`Failed to load collection data from ${topCollectionUrl} or ${manifestsCollectionUrl}`);
          return;
        }
        setItems(topItems?.length ? topItems : (manifestItems ?? []));
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [debugBase]);

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
        return (item.label || "").toLowerCase().includes(term) || (item.slug || "").toLowerCase().includes(term);
      });
  }, [items, resourceFilter, searchTerm]);

  if (error) return <p className="text-red-700">{error}</p>;
  if (!items) return <p>Loading site…</p>;

  return (
    <main>
      <section className="mb-4">
        <h2 className="text-2xl font-semibold">Browse</h2>
        <p className="text-slate-500">Top collection items with direct links to debug pages.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by label or slug"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
          <ResourceFilterTabs resourceFilter={resourceFilter} onChange={setResourceFilter} />
        </div>
        <p className="mt-2 text-xs text-slate-500">{featured.length} results</p>
      </section>

      <section className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {featured.map((item) => (
          <FeaturedItemCard key={`${item.slug}-${item.id}`} debugBase={debugBase} item={item} />
        ))}
      </section>

      {!featured.length ? (
        <section className="mt-4 border border-dashed border-gray-300 bg-white rounded-xl p-4">
          <p>No featured items found in top-level collections yet.</p>
        </section>
      ) : null}
    </main>
  );
}
