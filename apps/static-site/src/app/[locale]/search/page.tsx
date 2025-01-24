import { SearchPage } from "@/components/pages/SearchPage";
import { Page } from "@/components/Page";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { getBasicMetadata, makeTitle, getMdx, getDefaultMetaMdx } from "@/helpers/metadata";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
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

export default async function Search({ params }: { params: { locale: string } }) {
  unstable_setRequestLocale(params.locale);
  const page = getMdx({ params: { pageName: "Search", path: "/search", locale: params.locale } });
  return (
    <Page>
      <SearchPage title={page.title} />
    </Page>
  );
}
