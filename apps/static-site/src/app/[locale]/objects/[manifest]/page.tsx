import { ManifestLoader } from "@/app/provider";
import { Page } from "@/components/Page";
import { ManifestPage } from "@/components/pages/ManifestPage";
import { loadManifest, loadManifestMeta } from "@/iiif";
import related from "@repo/iiif/build/meta/related-objects.json";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function ManifestP({ params }: { params: { locale: string; manifest: string } }) {
  setRequestLocale(params.locale);
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

            // New.
            seeAlso: t("See also"),
            sharingViewers: t("Sharing / Viewers"),
            showMore: t("Show more"),
            showLess: t("Show less"),
            downloadImage: t("Download image"),
            currentPage: t("Copy link to current page"),
          }}
          manifest={manifest}
          meta={meta}
          related={relatedSnippets}
        />
      </ManifestLoader>
    </Page>
  );
}
