import { useEffect, useState } from "react";
import type {
  SlugCollisionPreviewResponse,
  SlugCompilePreviewResponse,
  SlugsConfigResponse,
} from "./types";

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function SlugWorkshopPage({ debugBase }: { debugBase: string }) {
  const [data, setData] = useState<SlugsConfigResponse | null>(null);
  const [editorValue, setEditorValue] = useState("{}");
  const [compilePreview, setCompilePreview] =
    useState<SlugCompilePreviewResponse | null>(null);
  const [collisionPreview, setCollisionPreview] =
    useState<SlugCollisionPreviewResponse | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${debugBase}/api/config/slugs`)
      .then((response) => response.json())
      .then((json: SlugsConfigResponse) => {
        if (cancelled) return;
        setData(json);
        setEditorValue(pretty(json.slugs || {}));
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [debugBase]);

  const parseEditor = () => {
    try {
      return JSON.parse(editorValue);
    } catch (error) {
      throw new Error(`Invalid JSON: ${(error as Error).message}`);
    }
  };

  const onCompilePreview = async () => {
    setError(null);
    setStatus(null);
    try {
      const slugs = parseEditor();
      const response = await fetch(
        `${debugBase}/api/config/slugs/compile-preview`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slugs }),
        },
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(
          json?.error || `Compile preview failed (${response.status})`,
        );
      }
      setCompilePreview(json);
    } catch (e) {
      setError(String(e));
    }
  };

  const onCollisionPreview = async () => {
    setError(null);
    setStatus(null);
    try {
      const slugs = parseEditor();
      const response = await fetch(
        `${debugBase}/api/config/slugs/collision-preview`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slugs }),
        },
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(
          json?.error || `Collision preview failed (${response.status})`,
        );
      }
      setCollisionPreview(json);
    } catch (e) {
      setError(String(e));
    }
  };

  const onSave = async () => {
    setError(null);
    setStatus(null);
    try {
      const slugs = parseEditor();
      const response = await fetch(`${debugBase}/api/config/slugs/save`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slugs }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || `Save failed (${response.status})`);
      }
      setStatus(`Saved slug config to ${json.path}`);
      setData((previous) => (previous ? { ...previous, slugs } : previous));
    } catch (e) {
      setError(String(e));
    }
  };

  if (error && !data) {
    return <p className="text-red-700">{error}</p>;
  }
  if (!data) {
    return <p>Loading slugs…</p>;
  }

  return (
    <main>
      <section className="mb-4">
        <h2 className="text-2xl font-semibold">Slug Workshop</h2>
        <p className="text-slate-500 mt-1">
          Test slug templates and detect collisions across current cached
          resources.
        </p>
      </section>

      {!data.writable && data.reason ? (
        <section className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {data.reason}
        </section>
      ) : null}

      <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-800"
            onClick={onCompilePreview}
          >
            Compile preview
          </button>
          <button
            type="button"
            className="rounded bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-800"
            onClick={onCollisionPreview}
          >
            Collision preview
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
      </section>

      <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="font-semibold mb-2">Slug config JSON</h3>
        <textarea
          className="h-72 w-full rounded border border-gray-300 p-2 font-mono text-xs"
          value={editorValue}
          onChange={(event) => setEditorValue(event.target.value)}
        />
      </section>

      {compilePreview ? (
        <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="font-semibold mb-2">Compile preview</h3>
          <pre className="rounded bg-slate-50 border border-gray-200 p-3 text-xs overflow-auto">
            {pretty(compilePreview)}
          </pre>
        </section>
      ) : null}

      {collisionPreview ? (
        <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="font-semibold mb-2">Collision preview</h3>
          <pre className="rounded bg-slate-50 border border-gray-200 p-3 text-xs overflow-auto">
            {pretty(collisionPreview)}
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
