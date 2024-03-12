import { Page } from "@/components/Page";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { ExhibitionListing } from "@/components/pages/ExhibitionListing";
import { Slot } from "@/blocks/slot";
import exhibitions from "@repo/iiif/build/collections/exhibitions/collection.json";

export default async function ExhibitionsPage({ params }: { params: { locale: string } }) {
  unstable_setRequestLocale(params.locale);
  const t = await getTranslations();
  return (
    <Page>
      <h1 className="my-5 text-4xl font-bold">{t("Exhibitions")}</h1>
      <Slot name="main-exhibitions" context={{ locale: params.locale }} />
      {/* Turn off default listing here. */}
      <ExhibitionListing content={{ exhibition: t("Exhibition") }} exhibitions={exhibitions.items as any} />
    </Page>
  );
}
