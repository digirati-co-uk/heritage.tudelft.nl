import { facetConfig } from "@/facets";
import { useMemo } from "react";
import { LocaleString } from "react-iiif-vault";
import { RefinementList, useRefinementList } from "react-instantsearch";

export function FacetList({ facet }: { facet: string }) {
  const { canRefine } = useRefinementList({ attribute: facet });
  const { isDefault, label } = useMemo(() => {
    const facetName = facet.replace("topic_", "");
    const defaultLabel = { none: [facetName] };
    const config = facetConfig.metadata[facetName as keyof typeof facetConfig.metadata];
    if (config?.label) {
      return { isDefault: false, label: config.label };
    }
    return { isDefault: true, label: defaultLabel };
  }, [facet]);
  if (!canRefine) {
    return null;
  }
  return (
    <div className="mb-8">
      <LocaleString
        as="h3"
        className={`mb-3 text-xl font-medium leading-tight text-gray-900 ${isDefault && "capitalize"}`}
      >
        {label}
      </LocaleString>
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
