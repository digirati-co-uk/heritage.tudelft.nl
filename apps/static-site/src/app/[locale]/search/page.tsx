import { SearchPage } from "@/components/pages/SearchPage";
import { Page } from "@/components/Page";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { getSiteName, getBasicMetadata, makeTitle, getMdx } from "@/helpers/metadata";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations();
  const siteName = await getSiteName();
  const page = getMdx({ params: { pageName: "Search", path: "/search", locale: params.locale } });
  const title = makeTitle([page.title || t("Search"), siteName]);
  const description = page.description || t("defaultDesc");
  const image = page.image;
  return getBasicMetadata(params.locale, siteName, title, description, image);
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
