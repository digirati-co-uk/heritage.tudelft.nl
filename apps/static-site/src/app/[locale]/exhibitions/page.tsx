import { Page } from "@/components/Page";
import { unstable_setRequestLocale } from "next-intl/server";
import { ExhibitionListing } from "@/components/pages/ExhibitionListing";
import { Slot } from "@/blocks/slot";
import exhibitions from "@repo/iiif/build/collections/exhibitions/collection.json";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getBasicMetadata, makeTitle, getMdx, getDefaultMetaMdx } from "@/helpers/metadata";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations();
  const path = "/exhibitions";
  const defaultMeta = getDefaultMetaMdx({ params: { locale: params.locale } });
  const page = getMdx({ params: { pageName: "Exhibitions", path: path, locale: params.locale } });
  const title = makeTitle([page.title, defaultMeta.title]);
  const description = page.description ?? defaultMeta.description;
  return getBasicMetadata({
    locale: params.locale,
    siteName: defaultMeta.title,
    title: title,
    description: description,
    image: {
      url: page.image ?? defaultMeta.image,
      width: page.image ? page.imageWidth : defaultMeta.imageWidth,
      height: page.image ? page.imageHeight : defaultMeta.imageHeight,
    },
    path: path,
  });
}

export default function ExhibitionsPage({ params }: { params: { locale: string } }) {
  unstable_setRequestLocale(params.locale);
  return (
    <Page>
      <Slot name="main-exhibitions" context={{ locale: params.locale }} />
      {/* Turn off default listing here. */}
      {/* <ExhibitionListing content={{ exhibition: t("Exhibition") }} exhibitions={exhibitions.items as any} /> */}
    </Page>
  );
}
