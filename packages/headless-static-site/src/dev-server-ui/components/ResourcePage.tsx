import { useEffect, useState } from "react";
import { CollectionResourcePage } from "./CollectionResourcePage";
import { ManifestResourcePage } from "./ManifestResourcePage";
import type { ResourceResponse } from "./types";
import { encodeSlugPath, getMetaThumbnailId, getThumbnailId } from "./utils";

export function ResourcePage({
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

  const thumb =
    getMetaThumbnailId(data.meta) || getThumbnailId(data.resource?.thumbnail);

  if (data.type === "Collection") {
    return (
      <CollectionResourcePage debugBase={debugBase} data={data} thumb={thumb} />
    );
  }

  return <ManifestResourcePage data={data} thumb={thumb} />;
}
