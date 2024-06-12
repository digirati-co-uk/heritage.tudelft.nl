import { Page } from "@/components/Page";
import { unstable_setRequestLocale } from "next-intl/server";
import { ExhibitionListing } from "@/components/pages/ExhibitionListing";
import { Slot } from "@/blocks/slot";
import exhibitions from "@repo/iiif/build/collections/exhibitions/collection.json";

export default function ExhibitionsPage({ params }: { params: { locale: string } }) {
  unstable_setRequestLocale(params.locale);
  return (
    <Page>
      <Slot className="mt-8" name="main-exhibitions" context={{ locale: params.locale }} />
      {/* Turn off default listing here. */}
      {/* <ExhibitionListing content={{ exhibition: t("Exhibition") }} exhibitions={exhibitions.items as any} /> */}
    </Page>
  );
}
