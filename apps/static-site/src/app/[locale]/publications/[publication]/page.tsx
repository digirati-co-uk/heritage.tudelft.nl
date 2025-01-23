import { allPublications } from "contentlayer/generated";
import { Page } from "@/components/Page";
import { PublicationPage } from "@/components/pages/PublicationPage";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { getValue } from "@iiif/helpers";
import { getSiteName, baseURL, makeTitle, getDefaultMetaMdx } from "@/helpers/metadata";

export async function generateMetadata({
  params,
}: {
  params: { publication: string; locale: string };
}): Promise<Metadata> {
  const t = await getTranslations();
  const defaultMeta = getDefaultMetaMdx({ params: { locale: params.locale } });
  const getValueParams = { language: params.locale, fallbackLanguages: ["nl", "en"] };
  const publicationInLanguage = allPublications.find(
    (post) => post.id === params.publication && post.lang === params.locale
  );
  const publication = publicationInLanguage || allPublications.find((post) => post.id === params.publication);
  const pubTitle = (publication && getValue(publication.title, getValueParams)) ?? defaultMeta.title;
  const siteName = await getSiteName();
  const title = makeTitle([pubTitle, siteName]);
  const description = (publication && getValue(publication.description, getValueParams)) ?? defaultMeta.description;
  const author = {
    name: (publication && getValue(publication.author, getValueParams)) || "",
  };
  const pubDateStr = publication && getValue(publication.date, getValueParams);
  const pubDate = pubDateStr && new Date(pubDateStr).toISOString();
  const publicationsURL = `/publications`;

  return {
    metadataBase: new URL(baseURL),
    authors: author,
    title: title,
    description: description,
    openGraph: {
      authors: [author.name],
      locale: params.locale,
      publishedTime: pubDate,
      siteName: siteName,
      title: title,
      type: "article",
      url: publication ? `${publicationsURL}/${publication.id}` : publicationsURL,
      images: [
        {
          url: publication?.image ?? defaultMeta.image ?? "",
          width: publication?.image ? publication?.imageWidth : defaultMeta.imageWidth,
          height: publication?.image ? publication?.imageHeight : defaultMeta.imageHeight,
        },
      ],
    },
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
