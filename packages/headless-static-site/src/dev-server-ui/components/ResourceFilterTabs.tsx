import type { ResourceFilter } from "./types";

const FILTERS: Array<{ id: ResourceFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "manifest", label: "Manifests" },
  { id: "collection", label: "Collections" },
];

export function ResourceFilterTabs({
  resourceFilter,
  onChange,
}: {
  resourceFilter: ResourceFilter;
  onChange: (filter: ResourceFilter) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {FILTERS.map((entry) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onChange(entry.id)}
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            resourceFilter === entry.id
              ? "border-slate-800 bg-slate-900 text-white"
              : "border-gray-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {entry.label}
        </button>
      ))}
    </div>
  );
}
