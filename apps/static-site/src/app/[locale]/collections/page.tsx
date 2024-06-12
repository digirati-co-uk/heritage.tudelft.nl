import { Page } from "@/components/Page";
import { Slot } from "@/blocks/slot";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { CollectionListing } from "@/components/pages/CollectionListing";

export default async function Collections(props: { params: { locale: string } }) {
  unstable_setRequestLocale(props.params.locale);
  const t = await getTranslations();
  // List of collections.
  return (
    <Page>

      <Slot name="main-collections" context={{ locale: props.params.locale }} />

      {/* <CollectionListing /> */}
    </Page>
  );
}
