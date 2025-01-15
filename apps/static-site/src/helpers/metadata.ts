import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const siteURL = "https://heritage.tudelft.nl";
export const fallbackImage = "/logo/TUDelft_logo_rgb.png";

export async function getSiteName() {
  const t = await getTranslations();
  return `TU Delft ${t("Academic Heritage")}`;
}

export function getMetadata(locale: string, siteName: string, title: string, description: string): Metadata {
  return {
    //metadataBase: TODO: add this using host
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: [
        {
          url: "/logo/TUDelft_logo_rgb.png",
          width: 1080,
          height: 665,
        },
      ],
      locale: locale,
      siteName: siteName,
      type: "website",
      url: "https://heritage.tudelft.nl/",
    },
  };
}
