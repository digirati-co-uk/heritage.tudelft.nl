import { Page } from "@/components/Page";
import { PublicationListPage } from "@/components/pages/PublicationListPage";
import { allPublications } from "contentlayer/generated";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { getBasicMetadata, makeTitle, getMdx, getDefaultMetaMdx } from "@/helpers/metadata";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations();
  const path = "/publications";
  const defaultMeta = getDefaultMetaMdx({ params: { locale: params.locale } });
  const page = getMdx({ params: { pageName: "Publications", path: path, locale: params.locale } });
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

export default async function PublicationsList({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations();

  return (
    <Page>
      <h1 className="mb-8 text-4xl font-medium">{t("Publications")}</h1>
      <PublicationListPage locale={params.locale} publications={allPublications} />
    </Page>
  );
}
