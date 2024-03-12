import { allPublications } from "contentlayer/generated";
import { Page } from "@/components/Page";
import { PublicationPage } from "@/components/pages/PublicationPage";
import { unstable_setRequestLocale } from "next-intl/server";

export default async function Publication({ params }: { params: { publication: string; locale: string } }) {
  unstable_setRequestLocale(params.locale);

  const publication = allPublications.find((post) => post.id === params.publication);

  if (!publication) throw new Error("Publication not found");

  return (
    <Page>
      <PublicationPage publication={publication} locale={params.locale} />
    </Page>
  );
}
