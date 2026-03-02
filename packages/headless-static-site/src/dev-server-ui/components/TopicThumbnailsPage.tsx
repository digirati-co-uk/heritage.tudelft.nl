import { useEffect, useState } from "react";
import type { TopicThumbnailResponse } from "./types";

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function TopicThumbnailsPage({ debugBase }: { debugBase: string }) {
  const [data, setData] = useState<TopicThumbnailResponse | null>(null);
  const [strategy, setStrategy] = useState<
    "first" | "mostRecent" | "highestRes" | "random"
  >("first");
  const [fallback, setFallback] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [overrideValues, setOverrideValues] = useState<Record<string, string>>(
    {},
  );
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${debugBase}/api/topics/thumbnails`)
      .then((response) => response.json())
      .then((json: TopicThumbnailResponse) => {
        if (cancelled) return;
        setData(json);
        setStrategy(json.config.selectionStrategy || "first");
        setFallback(json.config.fallback || "");
        const initialOverrides: Record<string, string> = {};
        for (const entry of json.entries || []) {
          initialOverrides[entry.key] =
            entry.currentThumbnail || entry.candidates[0] || "";
        }
        setOverrideValues(initialOverrides);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [debugBase]);

  const currentConfig = {
    selectionStrategy: strategy,
    fallback: fallback.trim() || null,
  };

  const onPreview = async () => {
    setError(null);
    setStatus(null);
    try {
      const response = await fetch(
        `${debugBase}/api/topics/thumbnails/preview-selection`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ config: currentConfig }),
        },
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || `Preview failed (${response.status})`);
      }
      setPreview(json);
    } catch (e) {
      setError(String(e));
    }
  };

  const onSaveConfig = async () => {
    setError(null);
    setStatus(null);
    try {
      const response = await fetch(
        `${debugBase}/api/topics/thumbnails/save-config`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ config: currentConfig }),
        },
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || `Save failed (${response.status})`);
      }
      setStatus(`Saved topic thumbnail config to ${json.path}`);
    } catch (e) {
      setError(String(e));
    }
  };

  const onSaveOverride = async (
    key: string,
    topicType: string,
    topic: string,
  ) => {
    setError(null);
    setStatus(null);
    try {
      const thumbnail = (overrideValues[key] || "").trim();
      if (!thumbnail) {
        throw new Error("Select or provide a thumbnail URL.");
      }
      const response = await fetch(
        `${debugBase}/api/topics/thumbnails/save-override`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            topicType,
            topic,
            thumbnail,
          }),
        },
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(
          json?.error || `Save override failed (${response.status})`,
        );
      }
      setStatus(`Saved override for ${topicType} / ${topic}`);
      setData((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          entries: previous.entries.map((entry) =>
            entry.key === key
              ? {
                  ...entry,
                  currentThumbnail: thumbnail,
                }
              : entry,
          ),
        };
      });
    } catch (e) {
      setError(String(e));
    }
  };

  if (error && !data) {
    return <p className="text-red-700">{error}</p>;
  }
  if (!data) {
    return <p>Loading topic thumbnails…</p>;
  }

  return (
    <main>
      <section className="mb-4">
        <h2 className="text-2xl font-semibold">Topic Thumbnails</h2>
        <p className="text-slate-500 mt-1">
          Configure automatic selection and apply manual thumbnail overrides per
          topic.
        </p>
      </section>

      <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[220px_1fr_auto_auto] md:items-end">
          <label className="text-sm text-slate-700">
            selectionStrategy
            <select
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1"
              value={strategy}
              onChange={(event) =>
                setStrategy(
                  event.target.value as
                    | "first"
                    | "mostRecent"
                    | "highestRes"
                    | "random",
                )
              }
            >
              <option value="first">first</option>
              <option value="mostRecent">mostRecent</option>
              <option value="highestRes">highestRes</option>
              <option value="random">random</option>
            </select>
          </label>
          <label className="text-sm text-slate-700">
            fallback
            <input
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1"
              value={fallback}
              onChange={(event) => setFallback(event.target.value)}
              placeholder="https://example.org/fallback.jpg"
            />
          </label>
          <button
            type="button"
            className="rounded bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-800"
            onClick={onPreview}
          >
            Preview
          </button>
          <button
            type="button"
            className="rounded bg-blue-700 px-3 py-2 text-sm text-white hover:bg-blue-800"
            onClick={onSaveConfig}
          >
            Save config
          </button>
        </div>
      </section>

      <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="font-semibold mb-3">
          Topic entries ({data.entries.length})
        </h3>
        <div className="grid gap-2">
          {data.entries.map((entry) => (
            <div key={entry.key} className="rounded border border-gray-100 p-3">
              <p className="text-sm font-medium">
                {entry.topicType} / {entry.topic} ({entry.count})
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Current: {entry.currentThumbnail || "none"}
              </p>
              <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                  value={overrideValues[entry.key] || ""}
                  onChange={(event) =>
                    setOverrideValues((previous) => ({
                      ...previous,
                      [entry.key]: event.target.value,
                    }))
                  }
                  list={`candidates-${entry.key}`}
                />
                <datalist id={`candidates-${entry.key}`}>
                  {entry.candidates.map((candidate) => (
                    <option key={candidate} value={candidate} />
                  ))}
                </datalist>
                <button
                  type="button"
                  className="rounded bg-emerald-700 px-3 py-1 text-sm text-white hover:bg-emerald-800"
                  onClick={() =>
                    onSaveOverride(entry.key, entry.topicType, entry.topic)
                  }
                >
                  Save override
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {preview ? (
        <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="font-semibold mb-2">Preview selection</h3>
          <pre className="rounded bg-slate-50 border border-gray-200 p-3 text-xs overflow-auto">
            {pretty(preview)}
          </pre>
        </section>
      ) : null}

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
