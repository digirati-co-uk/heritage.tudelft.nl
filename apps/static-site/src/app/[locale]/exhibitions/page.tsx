import { Slot } from "@/blocks/slot";
import { Page } from "@/components/Page";
import { ExhibitionListing } from "@/components/pages/ExhibitionListing";
import exhibitions from "@repo/iiif/build/collections/exhibitions/collection.json";
import { setRequestLocale } from "next-intl/server";

export default function ExhibitionsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return (
    <Page>
      <Slot name="main-exhibitions" context={{ locale: params.locale }} />
      {/* Turn off default listing here. */}
      {/* <ExhibitionListing content={{ exhibition: t("Exhibition") }} exhibitions={exhibitions.items as any} /> */}
    </Page>
  );
}
