import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { allPages } from ".contentlayer/generated";

export const siteURL = "https://heritage.tudelft.nl";
export const fallbackImage = "/logo/TUDelft_logo_rgb.png";

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

export function getBasicMetadata(
  locale: string,
  siteName: string,
  title: string,
  description: string,
  image: string | null | undefined
): Metadata {
  return {
    metadataBase: new URL(siteURL),
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: [
        {
          url: image || defaultImage,
          width: 800,
          height: 800,
        },
      ],
      locale: locale,
      siteName: siteName,
      type: "website",
      url: "https://heritage.tudelft.nl/",
    },
  };
}

export function getMdx({ params }: { params: { pageName: string; path: string; locale: string } }) {
  const pages = allPages.filter((page) => page.path === params.path);
  const page = pages.find((p) => p.lang === params.locale) || pages[0];
  if (!page) throw new Error(`No ${params.pageName} page found for locale ${params.locale}`);
  return page;
}
