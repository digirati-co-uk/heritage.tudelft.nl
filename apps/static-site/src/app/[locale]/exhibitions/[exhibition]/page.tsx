import { Page } from "@/components/Page";
import { ExhibitionPage } from "@/components/pages/ExhibitionPage";
import { unstable_setRequestLocale } from "next-intl/server";
import { ManifestLoader } from "@/app/provider";
import imageServiceLinks from "@repo/iiif/build/meta/image-service-links.json";
import allExhibitions from "@repo/iiif/build/collections/exhibitions/collection.json";
import { SlotContext } from "@/blocks/slot-context";

export const generateStaticParams = async () => {
  const exhibitions = [];
  for (const item of allExhibitions.items) {
    const slug = item["hss:slug"].replace("manifests/", "");
    exhibitions.push({
      exhibition: slug,
      lang: "en",
    });
    exhibitions.push({
      exhibition: slug,
      lang: "nl",
    });
  }
  return exhibitions;
};

export default async function Exhibition({ params }: { params: { exhibition: string; locale: string } }) {
  unstable_setRequestLocale(params.locale);
  const manifestSlug = `manifests/${params.exhibition}`;
  const meta = await import(`@repo/iiif/build/manifests/${params.exhibition}/meta.json`);
  const manifest = await import(`@repo/iiif/build/manifests/${params.exhibition}/manifest.json`);
  const viewObjectLinks = imageServiceLinks[manifestSlug as keyof typeof imageServiceLinks] || [];

  return (
    <Page>
      <SlotContext name="exhibition" value={params.exhibition}>
        <ManifestLoader manifest={{ ...manifest }}>
          <ExhibitionPage
            manifest={{ ...manifest }}
            meta={meta as any}
            slug={params.exhibition}
            viewObjectLinks={viewObjectLinks}
            locale={params.locale}
          />
        </ManifestLoader>
      </SlotContext>
    </Page>
  );
}
