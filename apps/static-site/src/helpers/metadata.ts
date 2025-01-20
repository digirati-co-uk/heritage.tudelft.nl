import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { allPages } from ".contentlayer/generated";

export const baseURL = process.env["DEPLOY_PRIME_URL"] || "http://localhost:3000";

export async function getSiteName() {
  const t = await getTranslations();
  return `TU Delft ${t("Academic Heritage")}`;
}

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

export const defaultImage = "/metadata/default.jpg";

type GetBasicMetadataProps = {
  locale: string;
  siteName: string;
  title: string;
  description: string;
  image: string | null | undefined;
  path: string;
};

export function getBasicMetadata(params: GetBasicMetadataProps): Metadata {
  return {
    metadataBase: new URL(baseURL),
    title: params.title,
    description: params.description,
    openGraph: {
      title: params.title,
      description: params.description,
      images: [
        {
          url: params.image || defaultImage,
          width: 800,
          height: 800,
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
  const page = pages.find((p) => p.lang === params.locale) || pages[0];
  if (!page) throw new Error(`No ${params.pageName} page found for locale ${params.locale}`);
  return page;
}
