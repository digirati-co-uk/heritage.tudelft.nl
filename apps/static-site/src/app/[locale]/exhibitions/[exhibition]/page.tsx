import { ManifestLoader } from "@/app/provider";
import { SlotContext } from "@/blocks/slot-context";
import { Page } from "@/components/Page";
import { ExhibitionPage } from "@/components/pages/ExhibitionPage";
import { setRequestLocale } from "next-intl/server";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import imageServiceLinks from "@repo/iiif/build/meta/image-service-links.json";
import type { Metadata } from "next";
import { loadManifest, loadManifestMeta } from "@/iiif";
import { getValue } from "@iiif/helpers";
import { baseURL, makeTitle, getDefaultMetaMdx } from "@/helpers/metadata";

export async function generateMetadata({
  params,
}: {
  params: { exhibition: string; locale: string };
}): Promise<Metadata> {
  const t = await getTranslations();
  const defaultMeta = getDefaultMetaMdx({ params: { locale: params.locale } });
  const manifestSlug = `manifests/${params.exhibition}`;
  const meta = await loadManifestMeta(manifestSlug);
  const exTitle = getValue(meta.intlLabel, { language: params.locale, fallbackLanguages: ["nl", "en"] });
  const description =
    getValue(meta.intlSummary, { language: params.locale, fallbackLanguages: ["nl", "en"] }) ?? defaultMeta.description;
  const title = makeTitle([exTitle, defaultMeta.title]);
  const url = `/exhibitions/${params.exhibition}`;
  return {
    metadataBase: new URL(baseURL),
    description: description,
    title: title,
    openGraph: {
      locale: params.locale,
      siteName: defaultMeta.title,
      title: title,
      type: "website",
      url: url,
      images: [
        {
          url: meta.thumbnail.id ?? defaultMeta.image ?? "",
          width: meta.thumbnail ? meta.thumbnail.width : defaultMeta.imageWidth,
          height: meta.thumbnail ? meta.thumbnail.height : defaultMeta.imageHeight,
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
