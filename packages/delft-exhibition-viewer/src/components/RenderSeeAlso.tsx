import { LocaleString, useVault } from "react-iiif-vault";

export function RenderSeeAlso({ resource }: { resource: any }) {
  const vault = useVault();
  const res = vault.get(resource);

  return (
    <div className="underline">
      <a href={res.id} target="_blank" rel="noreferrer">
        <LocaleString>{res.label}</LocaleString>
      </a>
    </div>
  );
}
