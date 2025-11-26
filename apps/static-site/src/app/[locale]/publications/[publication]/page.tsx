import { Page } from "@/components/Page";
import { ArticleFeaturedIIIF } from "@/components/blocks/ArticleFeaturedIIIF";
import { PublicationPage } from "@/components/pages/PublicationPage";
import { baseURL, getDefaultMetaMdx, makeTitle } from "@/helpers/metadata";
import { getValue } from "@iiif/helpers";
import { allPublications } from "contentlayer/generated";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(data: {
  params: Promise<{ publication: string; locale: string }>;
}): Promise<Metadata> {
  const params = await data.params;
  const t = await getTranslations();
  const defaultMeta = getDefaultMetaMdx({ params: { locale: params.locale } });
  const getValueParams = {
    language: params.locale,
    fallbackLanguages: ["nl", "en"],
  };
  const publicationInLanguage = allPublications.find(
    (post) => post.id === params.publication && post.lang === params.locale,
  );
  const publication = publicationInLanguage || allPublications.find((post) => post.id === params.publication);
  const pubTitle = publication && getValue(publication.title, getValueParams);
  const title = makeTitle([pubTitle, defaultMeta.title]);
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
      siteName: defaultMeta.title,
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

export default async function Publication({
  params,
}: {
  params: Promise<{ publication: string; locale: string }>;
}) {
  const { locale, publication: publicationId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const publicationInLanguage = allPublications.find((post) => post.id === publicationId && post.lang === locale);
  const publication = publicationInLanguage || allPublications.find((post) => post.id === publicationId);

  if (!publication) throw new Error("Publication not found");

  return (
    <Page>
      <PublicationPage
        publication={publication}
        locale={locale}
        featured={
          <ArticleFeaturedIIIF
            publication={publication}
            content={{
              seeAlso: t("See also"),
            }}
          />
        }
      />
    </Page>
  );
}
