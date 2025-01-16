import { allPublications } from "contentlayer/generated";
import { Page } from "@/components/Page";
import { PublicationPage } from "@/components/pages/PublicationPage";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { getValue } from "@iiif/helpers";
import { getSiteName, siteURL, fallbackImage, makeTitle } from "@/helpers/metadata";

export async function generateMetadata({
  params,
}: {
  params: { publication: string; locale: string };
}): Promise<Metadata> {
  const t = await getTranslations();
  const publicationInLanguage = allPublications.find(
    (post) => post.id === params.publication && post.lang === params.locale
  );
  const publication = publicationInLanguage || allPublications.find((post) => post.id === params.publication);
  const pubTitle =
    publication && getValue(publication.title, { language: params.locale, fallbackLanguages: ["nl", "en"] });
  const siteName = await getSiteName();
  const title = makeTitle([pubTitle, siteName]);
  const author = {
    name:
      (publication && getValue(publication.author, { language: params.locale, fallbackLanguages: ["nl", "en"] })) || "",
  };
  const pubDateStr =
    publication && getValue(publication.date, { language: params.locale, fallbackLanguages: ["nl", "en"] });
  const pubDate = pubDateStr && new Date(pubDateStr);
  const pubDateFmt =
    pubDate &&
    pubDate.toLocaleString(params.locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  const publicationsURL = `${siteURL}/${params.locale}/publications`;
  const image =
    publication && getValue(publication.image, { language: params.locale, fallbackLanguages: ["nl", "en"] });
  return {
    metadataBase: new URL(siteURL),
    authors: author,
    title: title,
    description: null, // assume google will use the first paragraph
    openGraph: {
      authors: [author.name],
      locale: params.locale,
      publishedTime: pubDateFmt,
      siteName: siteName,
      title: title,
      type: "article",
      url: publication ? `${publicationsURL}/${publication.id}` : publicationsURL,
      images: [
        {
          url: image || fallbackImage,
          width: 1080,
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
