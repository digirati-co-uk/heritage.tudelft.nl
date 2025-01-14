import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function getSiteName() {
  const t = await getTranslations();
  return `TU Delft ${t("Academic Heritage")}`;
}

export function getMetadata(locale: string, siteName: string, title: string, description: string): Metadata {
  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: [
        {
          url: "/logo/TUDelft_logo_rgb.png",
          width: 1080,
        },
      ],
      locale: locale,
      siteName: siteName,
      type: "website",
      url: "https://heritage.tudelft.nl/",
    },
  };
}
