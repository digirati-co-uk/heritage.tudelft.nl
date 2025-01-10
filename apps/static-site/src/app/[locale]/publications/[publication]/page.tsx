import { Page } from "@/components/Page";
import { PublicationPage } from "@/components/pages/PublicationPage";
import { allPublications } from "contentlayer/generated";
import { setRequestLocale } from "next-intl/server";

export default async function Publication({ params }: { params: { publication: string; locale: string } }) {
  setRequestLocale(params.locale);

  const publicationInLanguage = allPublications.find(
    (post) => post.id === params.publication && post.lang === params.locale
  );
  const publication = publicationInLanguage || allPublications.find((post) => post.id === params.publication);

  if (!publication) throw new Error("Publication not found");

  return (
    <Page>
      <PublicationPage publication={publication} locale={params.locale} />
    </Page>
  );
}
