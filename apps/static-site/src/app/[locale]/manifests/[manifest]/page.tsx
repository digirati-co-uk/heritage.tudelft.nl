import { Page } from "@/components/Page";
import { client, loadJson, loadRelated } from "@/iiif";
import { unstable_setRequestLocale } from "next-intl/server";
import { Manifest } from "@iiif/presentation-3";
import { ManifestPage } from "@/components/pages/ManifestPage";
import { ManifestLoader } from "@/app/provider";
import { Suspense } from "react";

const related = await loadRelated();

export default async function ManifestP({ params }: { params: { locale: string; manifest: string } }) {
  unstable_setRequestLocale(params.locale);

  const manifestSlug = `manifests/${params.manifest}`;
  const { manifest, meta } = await client.loadManifest(manifestSlug);
  const manifestJson = await loadJson<Manifest>(manifest);
  const metaJson = await loadJson(meta);

  const relatedItems = related[manifestSlug] || [];
  const relatedSnippets = (
    await Promise.all(
      relatedItems.map(async (slug) => {
        try {
          const meta = await loadJson<any>((await client.loadManifest(slug)).meta);

          return {
            slug,
            label: meta.label || "Untitled",
            thumbnail: meta.thumbnail?.id,
            meta,
          };
        } catch (e) {
          return null;
        }
      })
    )
  ).filter((x) => x !== null);

  return (
    <Page>
      <ManifestLoader manifest={manifestJson}>
        <ManifestPage manifest={manifestJson} meta={metaJson as any} related={relatedSnippets} />
      </ManifestLoader>
    </Page>
  );
}
