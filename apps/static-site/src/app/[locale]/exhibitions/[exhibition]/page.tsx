import { Page } from "@/components/Page";
import { ExhibitionPage } from "@/components/pages/ExhibitionPage";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { ManifestLoader } from "@/app/provider";
import imageServiceLinks from "@repo/iiif/build/meta/image-service-links.json";
import allExhibitions from "@repo/iiif/build/collections/exhibitions/collection.json";
import { SlotContext } from "@/blocks/slot-context";
import type { Metadata } from "next";
import { loadManifest } from "@/iiif";
import { getValue } from "@iiif/helpers";

export async function generateMetadata({
  params,
}: {
  params: { exhibition: string; locale: string };
}): Promise<Metadata> {
  const t = await getTranslations();
  const manifestSlug = `manifests/${params.exhibition}`;
  const { manifest } = await loadManifest(manifestSlug);
  const siteName = `TU Delft ${t("Academic Heritage")}`;
  const title = getValue(manifest.label, { language: params.locale, fallbackLanguages: ["nl", "en"] });
  const description = getValue(manifest.summary, { language: params.locale, fallbackLanguages: ["nl", "en"] });
  return {
    title: `Exhibitions | ${title}`,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: [
        {
          url: "/logo/TUDelft_logo_rgb.svg",
        },
      ],
      locale: params.locale,
      siteName: siteName,
      type: "website",
      url: "https://heritage.tudelft.nl/",
    },
  };
}

export const generateStaticParams = async () => {
  const exhibitions = [];
  for (const item of allExhibitions.items) {
    const slug = item["hss:slug"].replace("manifests/", "");
    exhibitions.push({
      exhibition: slug,
      lang: "en",
    });
    exhibitions.push({
      exhibition: slug,
      lang: "nl",
    });
  }
  return exhibitions;
};

export default async function Exhibition({ params }: { params: { exhibition: string; locale: string } }) {
  unstable_setRequestLocale(params.locale);
  const manifestSlug = `manifests/${params.exhibition}`;
  const meta = await import(`@repo/iiif/build/manifests/${params.exhibition}/meta.json`);
  const manifest = await import(`@repo/iiif/build/manifests/${params.exhibition}/manifest.json`);
  const viewObjectLinks = imageServiceLinks[manifestSlug as keyof typeof imageServiceLinks] || [];

  return (
    <Page>
      <SlotContext name="exhibition" value={params.exhibition}>
        <ManifestLoader manifest={{ ...manifest }}>
          <ExhibitionPage
            manifest={{ ...manifest }}
            meta={meta as any}
            slug={params.exhibition}
            viewObjectLinks={viewObjectLinks}
            locale={params.locale}
          />
        </ManifestLoader>
      </SlotContext>
    </Page>
  );
}
