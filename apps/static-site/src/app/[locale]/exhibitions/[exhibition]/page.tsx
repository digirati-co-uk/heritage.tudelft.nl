import { ManifestLoader } from "@/app/provider";
import { SlotContext } from "@/blocks/slot-context";
import { Page } from "@/components/Page";
import { ExhibitionPage } from "@/components/pages/ExhibitionPage";
import { loadManifest } from "@/iiif";
import allExhibitions from "@repo/iiif/build/collections/exhibitions/collection.json";
import imageServiceLinks from "@repo/iiif/build/meta/image-service-links.json";
import { setRequestLocale } from "next-intl/server";

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
  setRequestLocale(params.locale);
  const manifestSlug = `manifests/${params.exhibition}`;
  const { manifest, meta } = await loadManifest(manifestSlug);
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
