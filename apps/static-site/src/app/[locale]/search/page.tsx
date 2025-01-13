import { SearchPage } from "@/components/pages/SearchPage";
import { Page } from "@/components/Page";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations();
  const siteName = `TU Delft ${t("Academic Heritage")}`;
  const title = `${siteName} | ${t("Search")}`;
  return {
    title: title,
    description: t("searchDesc"),
    openGraph: {
      title: title,
      description: t("searchDesc"),
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

export default async function Search({ params }: { params: { locale: string } }) {
  unstable_setRequestLocale(params.locale);
  const t = await getTranslations();
  return (
    <Page>
      <SearchPage title={t("Search")} />
    </Page>
  );
}
