import { Slot } from "@/blocks/slot";
import { Page } from "@/components/Page";
import { CollectionListing } from "@/components/pages/CollectionListing";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function Collections(props: { params: { locale: string } }) {
  setRequestLocale(props.params.locale);
  const t = await getTranslations();
  // List of collections.
  return (
    <Page>
      <Slot name="main-collections" context={{ locale: props.params.locale }} />

      {/* <CollectionListing /> */}
    </Page>
  );
}
