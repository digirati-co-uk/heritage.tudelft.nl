import { allPublications } from "contentlayer/generated";
import { unstable_setRequestLocale } from "next-intl/server";
import { PublicationListPage } from "@/components/pages/PublicationListPage";
import { Page } from "@/components/Page";

export default async function PublicationsList({
  params,
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(params.locale);

  return (
    <Page>
      <PublicationListPage publications={allPublications} />
    </Page>
  );
}
