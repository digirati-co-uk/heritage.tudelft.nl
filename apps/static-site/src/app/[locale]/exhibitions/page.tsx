import { Page } from "@/components/Page";
import { unstable_setRequestLocale } from "next-intl/server";
import { ExhibitionListing } from "@/components/pages/ExhibitionListing";
import { Slot } from "@/blocks/slot";
import exhibitions from "@repo/iiif/build/collections/exhibitions/collection.json";

export default async function ExhibitionsPage({ params }: { params: { locale: string } }) {
  unstable_setRequestLocale(params.locale);
  return (
    <Page>
      <h1 className="my-5 text-4xl font-bold">Exhibitions</h1>
      <Slot name="main-exhibitions" context={{ locale: params.locale }} />
      {/* Turn off default listing here. */}
      <ExhibitionListing exhibitions={exhibitions.items as any} />
    </Page>
  );
}
