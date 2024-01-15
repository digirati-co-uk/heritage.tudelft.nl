import { Manifest } from "@iiif/presentation-3";
import { AutoLanguage } from "@/components/pages/AutoLanguage";
import { Exhibition } from "@repo/exhibition-viewer";

export interface ExhibitionPageProps {
  manifest: Manifest;
  meta: {};
  slug: string;
}

export function ExhibitionPage(props: ExhibitionPageProps) {
  return (
    <div>
      <h1 className="text-3xl font-bold underline my-4">
        <AutoLanguage>{props.manifest.label}</AutoLanguage>
      </h1>
      <div>
        <AutoLanguage lines className="mb-3">
          {props.manifest.summary}
        </AutoLanguage>
        <AutoLanguage lines className="mb-3">
          {props.manifest.requiredStatement?.label}
        </AutoLanguage>
        <AutoLanguage lines className="mb-3 font-bold italic">
          {props.manifest.requiredStatement?.value}
        </AutoLanguage>
      </div>
      <div>
        <pre>{props.manifest.id}</pre>
      </div>
      <Exhibition manifest={props.manifest} />
    </div>
  );
}
