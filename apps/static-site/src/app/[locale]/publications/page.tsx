import { Page } from "@/components/Page";
import { PublicationListPage } from "@/components/pages/PublicationListPage";
import { allPublications } from "contentlayer/generated";
import { getTranslations, setRequestLocale } from "next-intl/server";

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
