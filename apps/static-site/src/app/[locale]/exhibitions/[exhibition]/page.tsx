import { ManifestLoader } from "@/app/provider";
import { Slot } from "@/blocks/slot";
import { SlotContext } from "@/blocks/slot-context";
import { Page } from "@/components/Page";
import { baseURL, getDefaultMetaMdx, makeTitle } from "@/helpers/metadata";
import { loadManifest, loadManifestMeta } from "@/iiif";
import { getValue } from "@iiif/helpers";
import imageServiceLinks from "@repo/iiif/build/meta/image-service-links.json";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import ExhibitionPage from "../../../../components/pages/ExhibitionPage";

export async function generateMetadata({
  params,
}: {
  params: { exhibition: string; locale: string };
}): Promise<Metadata> {
  const t = await getTranslations();
  const defaultMeta = getDefaultMetaMdx({ params: { locale: params.locale } });
  const manifestSlug = `manifests/${params.exhibition}`;
  const meta = await loadManifestMeta(manifestSlug);
  const exTitle = getValue(meta.intlLabel, {
    language: params.locale,
    fallbackLanguages: ["nl", "en"],
  });
  const description =
    getValue(meta.intlSummary, {
      language: params.locale,
      fallbackLanguages: ["nl", "en"],
    }) ?? defaultMeta.description;
  const title = makeTitle([exTitle, defaultMeta.title]);
  const url = `/exhibitions/${params.exhibition}`;
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
          url: meta.thumbnail?.id ?? defaultMeta.image ?? "",
          width: meta.thumbnail ? meta.thumbnail.width : defaultMeta.imageWidth,
          height: meta.thumbnail
            ? meta.thumbnail.height
            : defaultMeta.imageHeight,
        },
      ],
    },
  };
}

export default async function Exhibition({
  params,
}: { params: { exhibition: string; locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations();
  const manifestSlug = `manifests/${params.exhibition}`;
  const { manifest, meta } = await loadManifest(manifestSlug);
  const viewObjectLinks =
    imageServiceLinks[manifestSlug as keyof typeof imageServiceLinks] || [];

  return (
    <Page>
      <SlotContext name="exhibition" value={params.exhibition}>
        <ManifestLoader manifest={{ ...manifest }}>
          <ExhibitionPage
            manifest={manifest}
            meta={meta as any}
            slug={params.exhibition}
            viewObjectLinks={viewObjectLinks}
            locale={params.locale}
            content={{
              exhibition: t("Exhibition"),
              tableOfContents: t("Table of contents"),
            }}
          />
          <Slot
            name="exhibition"
            context={{ locale: params.locale, exhibition: params.exhibition }}
          />
        </ManifestLoader>
      </SlotContext>
    </Page>
  );
}
