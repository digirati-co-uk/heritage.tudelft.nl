import { Page } from "@/components/Page";
import { loadManifest, loadManifestMeta } from "@/iiif";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { ManifestPage } from "@/components/pages/ManifestPage";
import { ManifestLoader } from "@/app/provider";
import related from "@repo/iiif/build/meta/related-objects.json";
import type { Metadata } from "next";
import { getValue } from "@iiif/helpers";
import { baseURL, makeTitle, getDefaultMetaMdx } from "@/helpers/metadata";

export async function generateMetadata({
  params,
}: {
  params: { manifest: string; locale: string };
}): Promise<Metadata> {
  const t = await getTranslations();
  const defaultMeta = getDefaultMetaMdx({ params: { locale: params.locale } });
  const manifestSlug = `manifests/${params.manifest}`;
  const meta = await loadManifestMeta(manifestSlug);
  const objTitle = getValue(meta.intlLabel, { language: params.locale, fallbackLanguages: ["nl", "en"] });
  const description =
    getValue(meta.intlSummary, { language: params.locale, fallbackLanguages: ["nl", "en"] }) ?? defaultMeta.description;
  const title = makeTitle([objTitle, defaultMeta.title]);
  const url = `/objects/${params.manifest}`;
  return {
    metadataBase: new URL(baseURL),
    description: description,
    title: title,
    openGraph: {
      locale: params.locale,
      siteName: defaultMeta.title,
      title: title,
      type: "website",
      url: url,
      images: [
        {
          url: meta.thumbnail.id ?? defaultMeta.image ?? "",
          width: meta.thumbnail ? meta.thumbnail.width : defaultMeta.imageWidth,
          height: meta.thumbnail ? meta.thumbnail.height : defaultMeta.imageHeight,
        },
      ],
    },
  };
}

export default async function ManifestP({
  params,
  searchParams,
}: {
  params: { locale: string; manifest: string };
  searchParams: { id: string };
}) {
  unstable_setRequestLocale(params.locale);
  const t = await getTranslations();
  const idNum = searchParams?.id ? parseInt(searchParams.id) : 0;

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
          initialCanvasIndex={Number.isNaN(idNum) ? 0 : idNum}
        />
      </ManifestLoader>
    </Page>
  );
}
