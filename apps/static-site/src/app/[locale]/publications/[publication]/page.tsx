import { allPublications } from "contentlayer/generated";
import { Page } from "@/components/Page";
import { PublicationPage } from "@/components/pages/PublicationPage";
import { unstable_setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { getValue } from "@iiif/helpers";

export async function generateMetadata({
  params,
}: {
  params: { publication: string; locale: string };
}): Promise<Metadata> {
  const publicationInLanguage = allPublications.find(
    (post) => post.id === params.publication && post.lang === params.locale
  );
  const publication = publicationInLanguage || allPublications.find((post) => post.id === params.publication);
  const title =
    publication && getValue(publication.title, { language: params.locale, fallbackLanguages: ["nl", "en"] });
  const description = publication ? `${publication.author} ${publication.date}` : "";
  return {
    title: `Publication | ${title}`,
    description: description,
  };
}

export default async function Publication({ params }: { params: { publication: string; locale: string } }) {
  unstable_setRequestLocale(params.locale);

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
