import { useEffect, useState } from "react";
import type { CollectionsConfigResponse } from "./types";

function pretty(value: unknown) {
  return JSON.stringify(value || {}, null, 2);
}

function parseObject(input: string, name: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (error) {
    throw new Error(`Invalid ${name} JSON: ${(error as Error).message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${name} must be a JSON object`);
  }
  return parsed as Record<string, any>;
}

export function CollectionsConfigPage({ debugBase }: { debugBase: string }) {
  const [data, setData] = useState<CollectionsConfigResponse | null>(null);
  const [indexValue, setIndexValue] = useState("{}");
  const [manifestsValue, setManifestsValue] = useState("{}");
  const [collectionsValue, setCollectionsValue] = useState("{}");
  const [topicsValue, setTopicsValue] = useState("{}");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${debugBase}/api/config/collections`)
      .then((response) => response.json())
      .then((json: CollectionsConfigResponse) => {
        if (cancelled) return;
        setData(json);
        setIndexValue(pretty(json.collections?.index || {}));
        setManifestsValue(pretty(json.collections?.manifests || {}));
        setCollectionsValue(pretty(json.collections?.collections || {}));
        setTopicsValue(pretty(json.collections?.topics || {}));
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [debugBase]);

  const onSave = async () => {
    setError(null);
    setStatus(null);
    try {
      const collections = {
        index: parseObject(indexValue, "index"),
        manifests: parseObject(manifestsValue, "manifests"),
        collections: parseObject(collectionsValue, "collections"),
        topics: parseObject(topicsValue, "topics"),
      };
      const response = await fetch(`${debugBase}/api/config/collections/save`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ collections }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || `Save failed (${response.status})`);
      }
      setStatus(`Saved collection surfaces to ${json.path}`);
      setData((previous) =>
        previous ? { ...previous, collections } : previous,
      );
    } catch (e) {
      setError(String(e));
    }
  };

  if (error && !data) {
    return <p className="text-red-700">{error}</p>;
  }
  if (!data) {
    return <p>Loading collection surfaces…</p>;
  }

  return (
    <main>
      <section className="mb-4">
        <h2 className="text-2xl font-semibold">Collection Surface Editor</h2>
        <p className="text-slate-500 mt-1">
          Edit labels and summaries for top-level
          index/manifests/collections/topics surfaces.
        </p>
      </section>

      {!data.writable && data.reason ? (
        <section className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {data.reason}
        </section>
      ) : null}

      <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid gap-4">
          <label className="text-sm text-slate-700">
            index
            <textarea
              className="mt-1 h-28 w-full rounded border border-gray-300 p-2 font-mono text-xs"
              value={indexValue}
              onChange={(event) => setIndexValue(event.target.value)}
            />
          </label>
          <label className="text-sm text-slate-700">
            manifests
            <textarea
              className="mt-1 h-28 w-full rounded border border-gray-300 p-2 font-mono text-xs"
              value={manifestsValue}
              onChange={(event) => setManifestsValue(event.target.value)}
            />
          </label>
          <label className="text-sm text-slate-700">
            collections
            <textarea
              className="mt-1 h-28 w-full rounded border border-gray-300 p-2 font-mono text-xs"
              value={collectionsValue}
              onChange={(event) => setCollectionsValue(event.target.value)}
            />
          </label>
          <label className="text-sm text-slate-700">
            topics
            <textarea
              className="mt-1 h-28 w-full rounded border border-gray-300 p-2 font-mono text-xs"
              value={topicsValue}
              onChange={(event) => setTopicsValue(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="mb-4">
        <button
          type="button"
          className="rounded bg-blue-700 px-3 py-2 text-sm text-white hover:bg-blue-800 disabled:opacity-50"
          disabled={!data.writable}
          onClick={onSave}
        >
          Save & rebuild
        </button>
      </section>

      {status ? (
        <section className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
          {status}
        </section>
      ) : null}
      {error ? (
        <section className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </section>
      ) : null}
    </main>
  );
}
