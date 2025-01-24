import { Page } from "@/components/Page";
import { ExhibitionPage } from "@/components/pages/ExhibitionPage";
import { unstable_setRequestLocale } from "next-intl/server";
import { ManifestLoader } from "@/app/provider";
import imageServiceLinks from "@repo/iiif/build/meta/image-service-links.json";
import allExhibitions from "@repo/iiif/build/collections/exhibitions/collection.json";
import { SlotContext } from "@/blocks/slot-context";
import { loadManifest } from "@/iiif";
import { useState } from "react";

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

export default async function Exhibition({
  params,
  searchParams,
}: {
  params: { exhibition: string; locale: string };
  searchParams: { toc: string };
}) {
  unstable_setRequestLocale(params.locale);
  const manifestSlug = `manifests/${params.exhibition}`;
  const { manifest, meta } = await loadManifest(manifestSlug);
  const viewObjectLinks = imageServiceLinks[manifestSlug as keyof typeof imageServiceLinks] || [];
  const toc = searchParams.toc;

  return (
    <Page>
      {toc && <div className="fixed mx-auto my-auto border">I AM THE MODAL</div>}
      <SlotContext name="exhibition" value={params.exhibition}>
        <ManifestLoader manifest={{ ...manifest }}>
          <ExhibitionPage
            manifest={{ ...manifest }}
            meta={meta as any}
            slug={params.exhibition}
            viewObjectLinks={viewObjectLinks}
            locale={params.locale}
            toc={toc}
          />
        </ManifestLoader>
      </SlotContext>
    </Page>
  );
}
