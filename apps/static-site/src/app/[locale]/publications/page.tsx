import { allPublications } from "contentlayer/generated";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { PublicationListPage } from "@/components/pages/PublicationListPage";
import { Page } from "@/components/Page";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations();
  const siteName = `TU Delft ${t("Academic Heritage")}`;
  const title = `${siteName} | ${t("Publications")}`;
  return {
    title: title,
    description: t("publicationsDesc"),
    openGraph: {
      title: title,
      description: t("publicationsDesc"),
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

export default async function PublicationsList({ params }: { params: { locale: string } }) {
  unstable_setRequestLocale(params.locale);
  const t = await getTranslations();

  return (
    <Page>
      <h1 className="mb-8 text-4xl font-medium">{t("Publications")}</h1>
      <PublicationListPage locale={params.locale} publications={allPublications} />
    </Page>
  );
}
