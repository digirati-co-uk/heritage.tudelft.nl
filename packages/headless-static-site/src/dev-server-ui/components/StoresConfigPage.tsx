import { useEffect, useMemo, useState } from "react";
import type { StoresConfigResponse } from "./types";

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function StoresConfigPage({ debugBase }: { debugBase: string }) {
  const [data, setData] = useState<StoresConfigResponse | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [editorValue, setEditorValue] = useState("{}");
  const [preview, setPreview] = useState<any>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${debugBase}/api/config/stores`)
      .then((response) => response.json())
      .then((json: StoresConfigResponse) => {
        if (cancelled) return;
        setData(json);
        const firstStore = Object.keys(json.stores || {})[0] || "default";
        setSelectedStoreId(firstStore);
        setEditorValue(
          pretty(
            json.stores?.[firstStore] || {
              type: "iiif-json",
              path: "./content",
            },
          ),
        );
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [debugBase]);

  const storeIds = useMemo(
    () => Object.keys(data?.stores || {}),
    [data?.stores],
  );

  const onSelectStore = (storeId: string) => {
    setSelectedStoreId(storeId);
    setEditorValue(
      pretty(
        data?.stores?.[storeId] || { type: "iiif-json", path: "./content" },
      ),
    );
    setPreview(null);
  };

  const parseEditor = () => {
    try {
      return JSON.parse(editorValue);
    } catch (error) {
      throw new Error(`Invalid JSON: ${(error as Error).message}`);
    }
  };

  const onPreview = async () => {
    setError(null);
    setStatus(null);
    try {
      const store = parseEditor();
      const response = await fetch(`${debugBase}/api/config/stores/preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ store }),
      });
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
    if (!selectedStoreId.trim()) {
      setError("Store id is required");
      return;
    }
    setError(null);
    setStatus(null);
    try {
      const store = parseEditor();
      const response = await fetch(
        `${debugBase}/api/config/stores/${encodeURIComponent(selectedStoreId)}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ store }),
        },
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || `Save failed (${response.status})`);
      }
      setStatus(`Saved ${selectedStoreId} to ${json.path}`);
      setData((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          stores: {
            ...previous.stores,
            [selectedStoreId]: store,
          },
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
    return <p>Loading stores…</p>;
  }

  return (
    <main>
      <section className="mb-4">
        <h2 className="text-2xl font-semibold">Store Builder</h2>
        <p className="text-slate-500 mt-1">
          Edit `iiif-json` and `iiif-remote` stores and preview validation
          before save.
        </p>
      </section>

      {!data.writable && data.reason ? (
        <section className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {data.reason}
        </section>
      ) : null}

      <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[220px_1fr_1fr] md:items-end">
          <label className="text-sm text-slate-700">
            Store ID
            <input
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1"
              value={selectedStoreId}
              onChange={(event) => setSelectedStoreId(event.target.value)}
              list="store-ids"
            />
            <datalist id="store-ids">
              {storeIds.map((storeId) => (
                <option key={storeId} value={storeId} />
              ))}
            </datalist>
          </label>
          <label className="text-sm text-slate-700">
            Existing stores
            <select
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1"
              value={storeIds.includes(selectedStoreId) ? selectedStoreId : ""}
              onChange={(event) => onSelectStore(event.target.value)}
            >
              <option value="">Select…</option>
              {storeIds.map((storeId) => (
                <option key={storeId} value={storeId}>
                  {storeId}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-800"
              onClick={onPreview}
            >
              Preview
            </button>
            <button
              type="button"
              className="rounded bg-blue-700 px-3 py-2 text-sm text-white hover:bg-blue-800 disabled:opacity-50"
              onClick={onSave}
              disabled={!data.writable}
            >
              Save & rebuild
            </button>
          </div>
        </div>
      </section>

      <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="font-semibold mb-2">Store JSON</h3>
        <textarea
          className="h-72 w-full rounded border border-gray-300 p-2 font-mono text-xs"
          value={editorValue}
          onChange={(event) => setEditorValue(event.target.value)}
        />
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
