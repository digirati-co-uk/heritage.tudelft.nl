import { Page } from "@/components/Page";
import { ExhibitionPage } from "@/components/pages/ExhibitionPage";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { ManifestLoader } from "@/app/provider";
import imageServiceLinks from "@repo/iiif/build/meta/image-service-links.json";
import allExhibitions from "@repo/iiif/build/collections/exhibitions/collection.json";
import { SlotContext } from "@/blocks/slot-context";
import type { Metadata } from "next";
import { loadManifest, loadManifestMeta } from "@/iiif";
import { getValue } from "@iiif/helpers";
import { getSiteName, baseURL, defaultImage, makeTitle } from "@/helpers/metadata";

export async function generateMetadata({
  params,
}: {
  params: { exhibition: string; locale: string };
}): Promise<Metadata> {
  const t = await getTranslations();
  const manifestSlug = `manifests/${params.exhibition}`;
  const meta = await loadManifestMeta(manifestSlug);
  const siteName = await getSiteName();
  const exTitle = getValue(meta.intlLabel, { language: params.locale, fallbackLanguages: ["nl", "en"] });
  const description = getValue(meta.intlSummary, { language: params.locale, fallbackLanguages: ["nl", "en"] });
  const title = makeTitle([exTitle, siteName]);
  const url = `/exhibitions/${params.exhibition}`;
  return {
    metadataBase: new URL(baseURL),
    description: description,
    title: title,
    openGraph: {
      locale: params.locale,
      siteName: siteName,
      title: title,
      type: "website",
      url: url,
      images: [
        {
          url: meta.thumbnail.id || defaultImage,
          width: meta.thumbnail.width,
          height: meta.thumbnail.height,
        },
      ],
    },
  };
}

// no static rendering for now...
// export const generateStaticParams = async () => {
//   const exhibitions = [];
//   for (const item of allExhibitions.items) {
//     const slug = item["hss:slug"].replace("manifests/", "");
//     exhibitions.push({
//       exhibition: slug,
//       lang: "en",
//     });
//     exhibitions.push({
//       exhibition: slug,
//       lang: "nl",
//     });
//   }
//   return exhibitions;
// };

export default async function Exhibition({ params }: { params: { exhibition: string; locale: string } }) {
  unstable_setRequestLocale(params.locale);
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
