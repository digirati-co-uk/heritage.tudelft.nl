import { CollectionPage } from "@/components/pages/CollectionPage";
import { loadCollection } from "@/iiif";
import { Page } from "@/components/Page";
import { unstable_setRequestLocale } from "next-intl/server";

export default async function Collection({ params }: { params: { collection: string; locale: string } }) {
  unstable_setRequestLocale(params.locale);
  const { collection, meta } = await loadCollection(params.collection);

  return (
    <Page>
      <CollectionPage collection={collection as any} meta={meta as any} />
    </Page>
  );
}
