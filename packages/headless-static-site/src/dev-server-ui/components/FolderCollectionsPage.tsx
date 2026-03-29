import { useEffect, useState } from "react";
import type {
  FolderCollectionsPreviewResponse,
  FolderCollectionsResponse,
} from "./types";

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function parseCustomMap(input: string) {
  if (!input.trim()) {
    return {};
  }
  const parsed = JSON.parse(input);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("customMap must be a JSON object");
  }
  return parsed as Record<string, string>;
}

export function FolderCollectionsPage({ debugBase }: { debugBase: string }) {
  const [data, setData] = useState<FolderCollectionsResponse | null>(null);
  const [preview, setPreview] =
    useState<FolderCollectionsPreviewResponse | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [minDepth, setMinDepth] = useState(1);
  const [ignorePaths, setIgnorePaths] = useState("");
  const [labelStrategy, setLabelStrategy] = useState<
    "folderName" | "metadata" | "customMap"
  >("folderName");
  const [customMapText, setCustomMapText] = useState("{}");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${debugBase}/api/config/folder-collections`)
      .then((response) => response.json())
      .then((json: FolderCollectionsResponse) => {
        if (cancelled) return;
        setData(json);
        const config = json.config || {};
        setEnabled(config.enabled !== false);
        setMinDepth(typeof config.minDepth === "number" ? config.minDepth : 1);
        setIgnorePaths((config.ignorePaths || []).join("\n"));
        setLabelStrategy(config.labelStrategy || "folderName");
        setCustomMapText(pretty(config.customMap || {}));
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [debugBase]);

  const buildConfig = () => {
    const customMap = parseCustomMap(customMapText);
    return {
      enabled,
      minDepth,
      ignorePaths: ignorePaths
        .split("\n")
        .map((entry) => entry.trim())
        .filter(Boolean),
      labelStrategy,
      customMap,
    };
  };

  const onPreview = async () => {
    setError(null);
    setStatus(null);
    try {
      const config = buildConfig();
      const response = await fetch(
        `${debugBase}/api/config/folder-collections/preview`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ config }),
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

  const onSave = async () => {
    setError(null);
    setStatus(null);
    try {
      const config = buildConfig();
      const response = await fetch(
        `${debugBase}/api/config/folder-collections/save`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ config }),
        },
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || `Save failed (${response.status})`);
      }
      setStatus(`Saved folder collection config to ${json.path}`);
      setData((previous) => (previous ? { ...previous, config } : previous));
    } catch (e) {
      setError(String(e));
    }
  };

  if (error && !data) {
    return <p className="text-red-700">{error}</p>;
  }
  if (!data) {
    return <p>Loading folder collections…</p>;
  }

  return (
    <main>
      <section className="mb-4">
        <h2 className="text-2xl font-semibold">Folder Collections</h2>
        <p className="text-slate-500 mt-1">
          Preview folder-to-collection mappings and exclusions before saving
          config.
        </p>
      </section>

      {!data.writable && data.reason ? (
        <section className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {data.reason}
        </section>
      ) : null}

      <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-700 flex items-center gap-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            Enabled
          </label>
          <label className="text-sm text-slate-700">
            minDepth
            <input
              type="number"
              min={0}
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1"
              value={minDepth}
              onChange={(event) => setMinDepth(Number(event.target.value) || 0)}
            />
          </label>
          <label className="text-sm text-slate-700">
            labelStrategy
            <select
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1"
              value={labelStrategy}
              onChange={(event) =>
                setLabelStrategy(
                  event.target.value as "folderName" | "metadata" | "customMap",
                )
              }
            >
              <option value="folderName">folderName</option>
              <option value="metadata">metadata</option>
              <option value="customMap">customMap</option>
            </select>
          </label>
        </div>
      </section>

      <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <label className="text-sm text-slate-700 block">
          ignorePaths (one glob per line)
          <textarea
            className="mt-1 h-24 w-full rounded border border-gray-300 p-2 font-mono text-xs"
            value={ignorePaths}
            onChange={(event) => setIgnorePaths(event.target.value)}
          />
        </label>
        <label className="text-sm text-slate-700 block mt-3">
          customMap (JSON object)
          <textarea
            className="mt-1 h-36 w-full rounded border border-gray-300 p-2 font-mono text-xs"
            value={customMapText}
            onChange={(event) => setCustomMapText(event.target.value)}
          />
        </label>
      </section>

      <section className="mb-4 flex gap-2">
        <button
          type="button"
          className="rounded bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-800"
          onClick={onPreview}
        >
          Preview mapping
        </button>
        <button
          type="button"
          className="rounded bg-blue-700 px-3 py-2 text-sm text-white hover:bg-blue-800 disabled:opacity-50"
          onClick={onSave}
          disabled={!data.writable}
        >
          Save & rebuild
        </button>
      </section>

      {preview ? (
        <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="font-semibold mb-2">Preview</h3>
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
