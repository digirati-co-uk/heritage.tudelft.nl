import { allPublications } from "contentlayer/generated";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { PublicationListPage } from "@/components/pages/PublicationListPage";
import { Page } from "@/components/Page";

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
