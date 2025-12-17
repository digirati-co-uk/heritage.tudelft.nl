import { Page } from "@/components/Page";
import { SearchPage } from "@/components/pages/SearchPage";
import { getBasicMetadata, getDefaultMetaMdx, getMdx, makeTitle } from "@/helpers/metadata";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(data: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await data.params;
  const t = await getTranslations();
  const path = "/search";
  const defaultMeta = getDefaultMetaMdx({ params: { locale: params.locale } });
  const page = getMdx({ params: { pageName: "Search", path: path, locale: params.locale } });
  const title = makeTitle([page.title, defaultMeta.title]);
  const description = page.description ?? defaultMeta.description;
  const image = page.image;
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

export default async function Search({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = getMdx({ params: { pageName: "Search", path: "/search", locale: locale } });
  return (
    <Page>
      <SearchPage title={page.title} locale={locale} />
    </Page>
  );
}
