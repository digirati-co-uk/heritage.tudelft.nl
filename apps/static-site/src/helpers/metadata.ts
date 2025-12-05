import type { Metadata } from "next";
import { allPages } from ".contentlayer/generated";
import { cache } from "react";

export const baseURL = process.env.URL ?? "http://localhost:3000";

// Removes any parts that have no value (i.e. collection title if label is "")
export function makeTitle(parts: (string | undefined | null)[]) {
  return parts.filter(str => str).join(" | ");
}

type GetBasicMetadataProps = {
  locale: string;
  title?: string;
  description?: string;
  image?: {
    url: string;
    width: number;
    height: number;
  };
  path: string;


  // Additional props.
  titleParts: (string | null | undefined)[];
};

export function metaFromMdx({ locale, pageName, path }: {
  pageName: string,
  path: string,
  locale: string
}) {
  const defaultMeta = getDefaultMetaMdx({ params: { locale } });
  const page = getMdx({ params: { pageName, path, locale } });

  return getBasicMetadata({
    locale: locale,
    titleParts: [page.title, defaultMeta.title],
    description: page.description || defaultMeta.description,
    image: mapImage(page) || mapImage(defaultMeta),
    path: path,
  });
}

function mapImage(image: { image?: string, imageHeight?: number, imageWidth?: number }) {
  if (!image.image) return undefined;
  return {
    url: image.image,
    width: image.imageWidth as number,
    height: image.imageHeight as number,
  };
}

export function getBasicMetadata(params: GetBasicMetadataProps): Metadata {
  const defaultPage = getDefaultMetaMdx({ params: { locale: params.locale } });

  return {
    metadataBase: new URL(baseURL),
    title: params.title,
    description: params.description,
    openGraph: {
      title: params.title,
      description: params.description,
      images: params.image ? [params.image] : [
        { url: defaultPage.image as string, width: defaultPage.imageWidth, height: defaultPage.imageHeight }
      ],
      locale: params.locale,
      siteName: defaultPage.title,
      type: "website",
      url: `${params.locale}${params.path}`,
    },
  };
}

export function getMdx({ params }: { params: { pageName: string; path: string; locale: string } }) {
  const pages = allPages.filter((page) => page.path === params.path);
  const page = pages.find((p) => p.lang === params.locale) ?? pages[0];
  if (!page) throw new Error(`No ${params.pageName} page found for locale ${params.locale}`);
  return page;
}

export function getDefaultMetaMdx({ params }: { params: { locale: string } }) {
  return getMdx({
    params: {
      pageName: "Home",
      path: "/",
      locale: params.locale,
    },
  });
}
