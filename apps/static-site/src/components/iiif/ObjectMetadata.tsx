import { ManifestMetadata } from "react-iiif-vault";

export function ObjectMetadata() {
  return (
    <ManifestMetadata
      allowHtml={true}
      separator="<br>"
      classes={{
        container: "m-4",
        row: "border-b border-gray-200 flex flex-col",
        label: "font-medium text-slate-600 text-md font-mono",
        value: "text-sm text-slate-800 text-xl mb-4",
        empty: "text-gray-400",
      }}
    />
  );
}
