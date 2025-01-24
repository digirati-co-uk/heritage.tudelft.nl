import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { allPages } from ".contentlayer/generated";
import { T } from "@iiif/helpers/dist/vault-actions-FZxiP2q-";
import { U } from "react-iiif-vault/dist/useRenderingStrategy-2EaRC2Nc";

export const baseURL = process.env["URL"] ?? "http://localhost:3000";

// Removes any parts that have no value (i.e. collection title if label is "")
export function makeTitle(parts: (string | undefined | null)[]) {
  let partsArray: string[] = [];
  for (const part of parts) {
    if (part) {
      partsArray.push(part);
    }
  }
  return partsArray.join(" | ");
}

type GetBasicMetadataProps = {
  locale: string;
  siteName: string;
  title: string | undefined;
  description: string | undefined;
  image: {
    url: string | null | undefined;
    width: number | undefined;
    height: number | undefined;
  };
  path: string;
};

export function getBasicMetadata(params: GetBasicMetadataProps): Metadata {
  const defaultPage = getDefaultMetaMdx({ params: { locale: params.locale } });
  return {
    metadataBase: new URL(baseURL),
    title: params.title,
    description: params.description,
    openGraph: {
      title: params.title,
      description: params.description,
      images: [
        {
          url: params.image.url ?? defaultPage.image ?? "",
          width: defaultPage.imageWidth ?? undefined,
          height: defaultPage.imageHeight ?? undefined,
        },
      ],
      locale: params.locale,
      siteName: params.siteName,
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
