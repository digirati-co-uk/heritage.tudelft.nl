import { Page } from "@/components/Page";
import { Slot } from "@/blocks/slot";
import { unstable_setRequestLocale } from "next-intl/server";
import { CollectionListing } from "@/components/pages/CollectionListing";

export default async function Collections(props: { params: { locale: string } }) {
  unstable_setRequestLocale(props.params.locale);
  // List of collections.
  return (
    <Page>
      <h1 className="my-5 text-4xl font-bold">Digital Collections</h1>

      <Slot name="main-collections" context={{ locale: props.params.locale }} />

      <CollectionListing />
    </Page>
  );
}
