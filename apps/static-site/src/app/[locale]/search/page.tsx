import { SearchPage } from "@/components/pages/SearchPage";
import { Page } from "@/components/Page";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `TU Delft ${t("Academic Heritage")} | ${t("Search")}`,
    description: "...",
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
