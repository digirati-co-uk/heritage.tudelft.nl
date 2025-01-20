import { Page } from "@/components/Page";
import { unstable_setRequestLocale } from "next-intl/server";
import { ExhibitionListing } from "@/components/pages/ExhibitionListing";
import { Slot } from "@/blocks/slot";
import exhibitions from "@repo/iiif/build/collections/exhibitions/collection.json";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSiteName, getBasicMetadata, makeTitle, getMdx } from "@/helpers/metadata";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations();
  const siteName = await getSiteName();
  const page = getMdx({ params: { pageName: "Exhibitions", path: "/exhibitions", locale: params.locale } });
  const title = makeTitle([page.title || t("Exhibitions"), siteName]);
  const description = page.description || t("defaultDesc");
  const image = page.image;
  return getBasicMetadata(params.locale, siteName, title, description, image);
}

export default function ExhibitionsPage({ params }: { params: { locale: string } }) {
  unstable_setRequestLocale(params.locale);
  return (
    <Page>
      <Slot name="main-exhibitions" context={{ locale: params.locale }} />
      {/* Turn off default listing here. */}
      {/* <ExhibitionListing content={{ exhibition: t("Exhibition") }} exhibitions={exhibitions.items as any} /> */}
    </Page>
  );
}
