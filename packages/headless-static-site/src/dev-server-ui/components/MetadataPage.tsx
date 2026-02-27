import { useEffect, useMemo, useState } from "react";
import type {
  CreateMetadataCollectionRequest,
  CreateMetadataCollectionResponse,
  MetadataAnalysisResponse,
} from "./types";

type LabelSelectionState = {
  enabled: boolean;
  topicType: string;
};

function toTopicKey(input: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return normalized || "topic";
}

function dedupe<T>(values: T[]) {
  return [...new Set(values)];
}

function formatYamlPreview(payload: CreateMetadataCollectionRequest) {
  const lines = ["topicTypes:"];
  const keys = Object.keys(payload.topicTypes).sort();
  for (const topicType of keys) {
    const labels = payload.topicTypes[topicType] || [];
    const rendered = labels.map((label) => `\"${label}\"`).join(", ");
    lines.push(`  ${topicType}: [${rendered}]`);
  }
  if (payload.commaSeparated && payload.commaSeparated.length) {
    const rendered = payload.commaSeparated
      .map((label) => `\"${label}\"`)
      .join(", ");
    lines.push(`commaSeparated: [${rendered}]`);
  }
  if (payload.language) {
    lines.push(`language: \"${payload.language}\"`);
  }
  if (typeof payload.translate !== "undefined") {
    lines.push(`translate: ${payload.translate ? "true" : "false"}`);
  }
  return lines.join("\n");
}

export function MetadataPage({ debugBase }: { debugBase: string }) {
  const [data, setData] = useState<MetadataAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [language, setLanguage] = useState("en");
  const [translate, setTranslate] = useState(true);
  const [labelSelection, setLabelSelection] = useState<
    Record<string, LabelSelectionState>
  >({});
  const [commaSeparatedTopics, setCommaSeparatedTopics] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    let cancelled = false;
    fetch(`${debugBase}/api/metadata-analysis`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load metadata analysis (${response.status})`,
          );
        }
        return response.json();
      })
      .then((json: MetadataAnalysisResponse) => {
        if (cancelled) {
          return;
        }
        setData(json);
        setError(null);

        const existing = json.extractTopicsConfig;
        const initialLanguage = existing?.language || "en";
        const initialTranslate = existing?.translate ?? true;
        const initialSelection: Record<string, LabelSelectionState> = {};
        const configuredLabelToTopicType = new Map<string, string>();

        for (const [topicType, labels] of Object.entries(
          existing?.topicTypes || {},
        )) {
          for (const label of labels || []) {
            configuredLabelToTopicType.set(label, topicType);
          }
        }

        const availableLabels = Object.keys(json.analysis?.foundKeys || {});
        for (const label of availableLabels) {
          const configuredTopicType = configuredLabelToTopicType.get(label);
          initialSelection[label] = {
            enabled: Boolean(configuredTopicType),
            topicType: configuredTopicType || toTopicKey(label),
          };
        }

        for (const [label, topicType] of configuredLabelToTopicType.entries()) {
          if (!initialSelection[label]) {
            initialSelection[label] = {
              enabled: true,
              topicType,
            };
          }
        }

        const initialCommaSeparated: Record<string, boolean> = {};
        for (const topicType of existing?.commaSeparated || []) {
          initialCommaSeparated[topicType] = true;
        }

        setLabelSelection(initialSelection);
        setCommaSeparatedTopics(initialCommaSeparated);
        setLanguage(initialLanguage);
        setTranslate(initialTranslate);
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(String(fetchError));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debugBase]);

  const sortedMetadataLabels = useMemo(() => {
    const entries = Object.entries(data?.analysis?.foundKeys || {});
    return entries.sort((a, b) => b[1] - a[1]);
  }, [data?.analysis?.foundKeys]);

  const groupedTopicTypes = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    for (const [label, selection] of Object.entries(labelSelection)) {
      if (!selection.enabled) {
        continue;
      }
      const topicType = selection.topicType.trim();
      if (!topicType) {
        continue;
      }
      grouped[topicType] = grouped[topicType] || [];
      grouped[topicType].push(label);
    }

    for (const key of Object.keys(grouped)) {
      grouped[key] = dedupe(grouped[key]).sort();
    }

    return grouped;
  }, [labelSelection]);

  const commaSeparated = useMemo(() => {
    return Object.keys(groupedTopicTypes)
      .filter((topicType) => commaSeparatedTopics[topicType])
      .sort();
  }, [commaSeparatedTopics, groupedTopicTypes]);

  const payloadPreview = useMemo(() => {
    return {
      topicTypes: groupedTopicTypes,
      commaSeparated,
      language,
      translate,
      mode,
    } satisfies CreateMetadataCollectionRequest & { mode: "merge" | "replace" };
  }, [commaSeparated, groupedTopicTypes, language, mode, translate]);

  const canSave = Object.keys(groupedTopicTypes).length > 0 && !saving;

  const onCreateCollection = async () => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const response = await fetch(
        `${debugBase}/api/metadata-analysis/create-collection`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            topicTypes: groupedTopicTypes,
            commaSeparated,
            language,
            translate,
            mode,
          } satisfies CreateMetadataCollectionRequest & {
            mode: "merge" | "replace";
          }),
        },
      );

      const json = (await response.json()) as
        | CreateMetadataCollectionResponse
        | { error: string };
      if (!response.ok) {
        throw new Error(
          (json as { error?: string })?.error ||
            `Failed to save (${response.status})`,
        );
      }

      const result = json as CreateMetadataCollectionResponse;
      const rebuildMessage = result.rebuild?.triggered
        ? result.rebuild.ok
          ? " Full rebuild completed."
          : ` Rebuild failed: ${result.rebuild.error || "unknown error"}.`
        : "";
      setSaveSuccess(`Saved to ${result.path}.${rebuildMessage}`);
      setData((previous) => {
        if (!previous) {
          return previous;
        }
        return {
          ...previous,
          extractTopicsConfig: result.extractTopicsConfig,
          warnings: result.warnings,
        };
      });
    } catch (submitError) {
      setSaveError(String(submitError));
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return <p className="text-red-700">{error}</p>;
  }

  if (!data) {
    return <p>Loading metadata analysis…</p>;
  }

  return (
    <main>
      <section className="mb-4">
        <h2 className="text-2xl font-semibold">Metadata Analysis</h2>
        <p className="text-slate-500 mt-1">
          Group metadata labels into topic types and generate extract-topics
          config.
        </p>
      </section>

      {data.warnings?.length ? (
        <section className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {data.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </section>
      ) : null}

      {!data.analysis ? (
        <section className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          metadata-analysis.json is missing for the current build output.
        </section>
      ) : null}

      <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm text-slate-700">
            Save mode
            <select
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1"
              value={mode}
              onChange={(event) =>
                setMode(event.target.value === "replace" ? "replace" : "merge")
              }
            >
              <option value="merge">merge</option>
              <option value="replace">replace</option>
            </select>
          </label>
          <label className="text-sm text-slate-700">
            Language
            <input
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            />
          </label>
          <label className="text-sm text-slate-700 flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              checked={translate}
              onChange={(event) => setTranslate(event.target.checked)}
            />
            Translate labels
          </label>
        </div>
      </section>

      <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="font-semibold mb-3">Metadata labels</h3>
        <div className="grid gap-2">
          {sortedMetadataLabels.map(([label, count]) => {
            const selection = labelSelection[label] || {
              enabled: false,
              topicType: toTopicKey(label),
            };
            return (
              <div
                key={label}
                className="grid gap-2 rounded border border-gray-100 p-2 md:grid-cols-[auto_1fr_220px] md:items-center"
              >
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selection.enabled}
                    onChange={(event) =>
                      setLabelSelection((previous) => ({
                        ...previous,
                        [label]: {
                          ...selection,
                          enabled: event.target.checked,
                        },
                      }))
                    }
                  />
                  <span className="font-medium">{label}</span>
                  <span className="text-slate-500">({count})</span>
                </label>
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                  value={selection.topicType}
                  onChange={(event) =>
                    setLabelSelection((previous) => ({
                      ...previous,
                      [label]: {
                        ...selection,
                        topicType: event.target.value,
                      },
                    }))
                  }
                  placeholder="topic type"
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="font-semibold mb-3">Topic types</h3>
        {!Object.keys(groupedTopicTypes).length ? (
          <p className="text-sm text-slate-500">
            Select at least one metadata label to generate topic types.
          </p>
        ) : (
          <div className="grid gap-2">
            {Object.entries(groupedTopicTypes)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([topicType, labels]) => (
                <div
                  key={topicType}
                  className="rounded border border-gray-100 p-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{topicType}</p>
                    <label className="text-xs text-slate-600 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(commaSeparatedTopics[topicType])}
                        onChange={(event) =>
                          setCommaSeparatedTopics((previous) => ({
                            ...previous,
                            [topicType]: event.target.checked,
                          }))
                        }
                      />
                      comma-separated values
                    </label>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    {labels.join(", ")}
                  </p>
                </div>
              ))}
          </div>
        )}
      </section>

      <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="font-semibold mb-2">Preview (YAML shape)</h3>
        <pre className="rounded border border-gray-200 bg-slate-50 p-3 text-xs overflow-auto">
          {formatYamlPreview(payloadPreview)}
        </pre>
        <p className="mt-2 text-xs text-slate-500">
          Writes JSON to: {data.outputPath}
        </p>
      </section>

      <section className="mb-4">
        <button
          type="button"
          className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canSave}
          onClick={onCreateCollection}
        >
          {saving ? "Saving…" : "Create collection from metadata"}
        </button>
        {saveSuccess ? (
          <p className="mt-2 text-sm text-green-700">{saveSuccess}</p>
        ) : null}
        {saveError ? (
          <p className="mt-2 text-sm text-red-700">{saveError}</p>
        ) : null}
      </section>
    </main>
  );
}
