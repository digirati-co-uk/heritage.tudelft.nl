import { ManifestLoader } from "@/app/provider";
import { Page } from "@/components/Page";
import { ManifestPage } from "@/components/pages/ManifestPage";
import { getArticlesForObject } from "@/helpers/get-articles-for-object";
import { baseURL, getDefaultMetaMdx, makeTitle } from "@/helpers/metadata";
import { loadManifest, loadManifestMeta } from "@/iiif";
import { getValue } from "@iiif/helpers";
import imageServiceLinks from "@repo/iiif/build/meta/image-service-links.json";
import related from "@repo/iiif/build/meta/related-objects.json";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ manifest: string; locale: string }>;
}): Promise<Metadata> {
  const { manifest: manifestId, locale } = await params;
  const t = await getTranslations();
  const defaultMeta = getDefaultMetaMdx({ params: { locale } });
  const manifestSlug = `manifests/${manifestId}`;
  const meta = await loadManifestMeta(manifestSlug);
  const objTitle = getValue(meta.intlLabel, {
    language: locale,
    fallbackLanguages: ["nl", "en"],
  });
  const description =
    getValue(meta.intlSummary, {
      language: locale,
      fallbackLanguages: ["nl", "en"],
    }) ?? defaultMeta.description;
  const title = makeTitle([objTitle, defaultMeta.title]);
  const url = `/objects/${manifestId}`;
  return {
    metadataBase: new URL(baseURL),
    description: description,
    title: title,
    openGraph: {
      locale: locale,
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
  params: Promise<{ locale: string; manifest: string }>;
  searchParams: Promise<{ id: string }>;
}) {
  const { locale, manifest: manifestId } = await params;
  const { id } = await searchParams;

  setRequestLocale(locale);
  const t = await getTranslations();
  const idNum = id ? Number.parseInt(id, 10) : 0;

  const manifestSlug = `manifests/${manifestId}`;
  const { manifest, meta } = await loadManifest(manifestSlug);
  const exhibitionsUnfiltered: any[] = imageServiceLinks[manifestSlug as keyof typeof imageServiceLinks] || [];
  const exhibitions = [];
  const seenIds: string[] = [];

  for (const exhibition of exhibitionsUnfiltered) {
    if (seenIds.includes(exhibition.slug)) continue;
    seenIds.push(exhibition.slug);
    exhibitions.push(exhibition);
  }

  const relatedItemsUnfiltered: any[] = related[manifestSlug as keyof typeof related] || [];
  const relatedItems = [];
  for (const item of relatedItemsUnfiltered) {
    if (seenIds.includes(item.slug)) continue;
    relatedItems.push(item);
    seenIds.push(item.slug);
  }

  const articles = getArticlesForObject(manifestSlug);

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
      }),
    )
  ).filter((x) => x !== null);

  const exhibitionRawLinks = (
    await Promise.all(
      exhibitions.map(async ({ slug }) => {
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
      }),
    )
  ).filter((x) => x !== null);

  const exhibitionLinks = exhibitionRawLinks.filter((item) => {
    return (item.meta.partOfCollections || []).find((t: any) => t.slug === "collections/exhibitions");
  });

  const illustrationLinks = exhibitionRawLinks.filter((item) => {
    return (item.meta.partOfCollections || []).find((t: any) => t.slug === "collections/illustrations");
  });

  return (
    <Page>
      <ManifestLoader manifest={{ ...manifest }}>
        <ManifestPage
          content={{
            untitled: t("Untitled"),
            relatedObjects: t("Related"),
            partOfCollections: t("Part of collections"),

            // Sharing.
            seeAlso: t("See also"),
            sharingViewers: t("Sharing"),
            showMore: t("Show more"),
            showLess: t("Show less"),
            iiifLabel: t("IIIF Manifest"),
            downloadImage: t("Download image"),
            download: t("Download"),
            currentPage: t("Permalink"),
            copiedMessage: t("Copied"),
            publication: t("Publication"),
          }}
          articles={articles}
          exhibitionLinks={exhibitionLinks}
          manifest={manifest}
          meta={meta}
          related={relatedSnippets}
          initialCanvasIndex={Number.isNaN(idNum) ? 0 : idNum}
        />
      </ManifestLoader>
    </Page>
  );
}
