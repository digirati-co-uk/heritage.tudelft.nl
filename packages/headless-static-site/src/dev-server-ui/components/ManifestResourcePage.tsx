import { JsonPanel } from "./JsonPanel";
import { ResourceSummaryCard } from "./ResourceSummaryCard";
import type { ResourceResponse } from "./types";

export function ManifestResourcePage({
  data,
  thumb,
}: {
  data: ResourceResponse;
  thumb: string | null;
}) {
  return (
    <main>
      <ResourceSummaryCard data={data} thumb={thumb} />
      <section>
        <JsonPanel title="IIIF Resource" value={data.resource} />
        <JsonPanel title="meta.json" value={data.meta} />
        <JsonPanel title="indices.json" value={data.indices} />
      </section>
    </main>
  );
}
