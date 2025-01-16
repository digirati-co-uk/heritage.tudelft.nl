import { SearchPage } from "@/components/pages/SearchPage";
import { Page } from "@/components/Page";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { getSiteName, getBasicMetadata, makeTitle } from "@/helpers/metadata";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations();
  const siteName = await getSiteName();
  const title = makeTitle([t("Search"), siteName]);
  const description = t("searchDesc");
  return getBasicMetadata(params.locale, siteName, title, description);
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
