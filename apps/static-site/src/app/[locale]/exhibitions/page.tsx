import { Slot } from "@/blocks/slot";
import { Page } from "@/components/Page";
import { getBasicMetadata, getDefaultMetaMdx, getMdx, makeTitle } from "@/helpers/metadata";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(data: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await data.params;
  const t = await getTranslations();
  const path = "/exhibitions";
  const defaultMeta = getDefaultMetaMdx({ params: { locale: params.locale } });
  const page = getMdx({
    params: { pageName: "Exhibitions", path: path, locale: params.locale },
  });
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

export default async function ExhibitionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  setRequestLocale(locale);

  return (
    <Page>
      <Slot name="main-exhibitions" context={{ locale: locale }} />
      {/* Turn off default listing here. */}
      {/* <ExhibitionListing content={{ exhibition: t("Exhibition") }} exhibitions={exhibitions.items as any} /> */}
    </Page>
  );
}
