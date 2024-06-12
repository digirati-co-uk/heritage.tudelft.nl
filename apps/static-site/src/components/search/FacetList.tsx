import { RefinementList, useRefinementList } from "react-instantsearch";

export function FacetList({ facet }: { facet: string }) {
  const { canRefine } = useRefinementList({ attribute: facet });
  const label = facet.replace("topic_", "");
  if (!canRefine) {
    return null;
  }
  return (
    <div className="mb-8">
      <h3 className="mb-3 text-xl font-medium capitalize leading-tight text-gray-900">{label}</h3>
      <RefinementList
        searchable
        autoCapitalize="on"
        key={facet}
        attribute={facet}
        classNames={{
          searchBox: "facet-search",
          checkbox: "ml-2",
          label: "flex gap-2 mb-0.5 text-lg hover:bg-slate-100 rounded-lg cursor-pointer p-0.5 items-center",
          labelText: "overflow-ellipsis truncate",
          count: "rounded-full bg-slate-300 px-2 py-0.5 text-xs  text-slate-800 self-center",
        }}
      />
    </div>
  );
}
