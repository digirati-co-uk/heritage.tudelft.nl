import { Page } from "@/components/Page";
import { Slot } from "@/blocks/slot";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { CollectionListing } from "@/components/pages/CollectionListing";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations();
  const siteName = `TU Delft ${t("Academic Heritage")}`;
  const title = `${siteName} | ${t("Collections")}`;
  return {
    title: title,
    description: t("collectionsDesc"),
    openGraph: {
      title: title,
      description: t("collectionsDesc"),
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
