import { ManifestLoader } from "@/app/provider";
import { Slot } from "@/blocks/slot";
import { SlotContext } from "@/blocks/slot-context";
import { Page } from "@/components/Page";
import { getViewObjectLinks } from "@/helpers/get-view-object-links";
import { baseURL, getDefaultMetaMdx, makeTitle } from "@/helpers/metadata";
import { loadManifest, loadManifestMeta, loadMeta } from "@/iiif";
import { getValue } from "@iiif/helpers";
import type imageServiceLinks from "@repo/iiif/build/meta/image-service-links.json";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import ExhibitionPage from "../../../../components/pages/ExhibitionPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ exhibition: string; locale: string }>;
}): Promise<Metadata> {
  const t = await getTranslations();
  const { exhibition, locale } = await params;
  const defaultMeta = getDefaultMetaMdx({ params: { locale } });
  const manifestSlug = `manifests/${exhibition}`;
  const meta = await loadManifestMeta(manifestSlug);
  const exTitle = getValue(meta.intlLabel, {
    language: locale,
    fallbackLanguages: ["nl", "en"],
  });
  const description =
    getValue(meta.intlSummary, {
      language: locale,
      fallbackLanguages: ["nl", "en"],
    }) ?? defaultMeta.description;
  const title = makeTitle([exTitle, defaultMeta.title]);
  const url = `/exhibitions/${exhibition}`;
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
          url: meta.thumbnail?.id ?? defaultMeta.image ?? "",
          width: meta.thumbnail ? meta.thumbnail.width : defaultMeta.imageWidth,
          height: meta.thumbnail ? meta.thumbnail.height : defaultMeta.imageHeight,
        },
      ],
    },
  };
}

export default async function Exhibition({
  params,
}: {
  params: Promise<{ exhibition: string; locale: string }>;
}) {
  const { exhibition, locale } = await params;

  setRequestLocale(locale);
  const t = await getTranslations();
  const manifestSlug = `manifests/${exhibition}`;
  const { manifest, meta } = await loadManifest(manifestSlug);
  const viewObjectLinks = await getViewObjectLinks(manifestSlug);

  return (
    <Page>
      <SlotContext name="exhibition" value={exhibition}>
        <ManifestLoader manifest={manifest}>
          <ExhibitionPage
            manifest={manifest}
            meta={meta as any}
            slug={exhibition}
            viewObjectLinks={viewObjectLinks}
            locale={locale}
            content={{
              exhibition: t("Exhibition"),
              tableOfContents: t("Table of contents"),
            }}
          />
          <Slot name="exhibition" context={{ locale, exhibition }} />
        </ManifestLoader>
      </SlotContext>
    </Page>
  );
}
