import { allPublications } from "contentlayer/generated";
import { Page } from "@/components/Page";
import { PublicationPage } from "@/components/pages/PublicationPage";
import { unstable_setRequestLocale } from "next-intl/server";
import { loadManifest, loadManifestMeta } from "@/iiif";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { publication: string; locale: string };
}): Promise<Metadata> {
  const publicationInLanguage = allPublications.find(
    (post) => post.id === params.publication && post.lang === params.locale
  );
  const publication = publicationInLanguage || allPublications.find((post) => post.id === params.publication);
  return {
    title: `Publications | ${(publication && publication.title) || ""}`,
    description: "Description",
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
