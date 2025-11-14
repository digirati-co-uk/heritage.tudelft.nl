import { Slot } from "@/blocks/slot";
import { Page } from "@/components/Page";
import { CollectionListing } from "@/components/pages/CollectionListing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getBasicMetadata,
  makeTitle,
  getMdx,
  getDefaultMetaMdx,
} from "@/helpers/metadata";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations();
  const path = "/collections";
  const defaultMeta = getDefaultMetaMdx({ params: { locale: params.locale } });
  const page = getMdx({
    params: { pageName: "Collections", path: path, locale: params.locale },
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

export default async function Collections(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <Page>
      <Slot name="main-collections" context={{ locale }} />
    </Page>
  );
}
