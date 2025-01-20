import { allPublications } from "contentlayer/generated";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { PublicationListPage } from "@/components/pages/PublicationListPage";
import { Page } from "@/components/Page";
import { Metadata } from "next";
import { getSiteName, getBasicMetadata, makeTitle, getMdx } from "@/helpers/metadata";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations();
  const siteName = await getSiteName();
  const page = getMdx({ params: { pageName: "Publications", path: "/publications", locale: params.locale } });
  const title = makeTitle([page.title || t("Publications"), siteName]);
  const description = page.description || t("defaultDesc");
  const image = page.image;

  return getBasicMetadata(params.locale, siteName, title, description, image);
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
