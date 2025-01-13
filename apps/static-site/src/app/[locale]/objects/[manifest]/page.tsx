import { Page } from "@/components/Page";
import { loadManifest, loadManifestMeta } from "@/iiif";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { ManifestPage } from "@/components/pages/ManifestPage";
import { ManifestLoader } from "@/app/provider";
import related from "@repo/iiif/build/meta/related-objects.json";
import type { Metadata } from "next";
import { getValue } from "@iiif/helpers";

export async function generateMetadata({
  params,
}: {
  params: { manifest: string; locale: string };
}): Promise<Metadata> {
  const manifestSlug = `manifests/${params.manifest}`;
  const { manifest } = await loadManifest(manifestSlug);
  const title = getValue(manifest.label, { language: params.locale, fallbackLanguages: ["nl", "en"] });
  const description = getValue(manifest.summary, { language: params.locale, fallbackLanguages: ["nl", "en"] });
  return {
    title: title,
    description: description,
  };
}

export default async function ManifestP({ params }: { params: { locale: string; manifest: string } }) {
  unstable_setRequestLocale(params.locale);
  const t = await getTranslations();

  const manifestSlug = `manifests/${params.manifest}`;
  const { manifest, meta } = await loadManifest(manifestSlug);

  const relatedItems = related[manifestSlug as keyof typeof related] || [];
  const relatedSnippets = (
    await Promise.all(
      relatedItems.map(async (slug) => {
        try {
          const meta = await loadManifestMeta(slug);

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
      <ManifestLoader manifest={{ ...manifest }}>
        <ManifestPage
          content={{
            untitled: t("Untitled"),
            relatedObjects: t("Related objects"),
            partOfCollections: t("Part of collections"),
          }}
          manifest={manifest}
          meta={meta}
          related={relatedSnippets}
        />
      </ManifestLoader>
    </Page>
  );
}
