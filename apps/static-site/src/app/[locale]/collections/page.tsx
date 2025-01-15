import { Page } from "@/components/Page";
import { Slot } from "@/blocks/slot";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { CollectionListing } from "@/components/pages/CollectionListing";
import { getSiteName, getMetadata } from "@/helpers/metadata";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations();
  const siteName = await getSiteName();
  const title = `${t("Collections")} | ${siteName}`;
  const description = t("collectionsDesc");
  return getMetadata(params.locale, siteName, title, description);
}

export default async function Collections(props: { params: { locale: string } }) {
  unstable_setRequestLocale(props.params.locale);
  const t = await getTranslations();
  // List of collections.
  return (
    <Page>
      <Slot name="main-collections" context={{ locale: props.params.locale }} />

      {/* <CollectionListing /> */}
    </Page>
  );
}
