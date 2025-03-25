import { Page } from "@/components/Page";
import { CollectionPage } from "@/components/pages/CollectionPage";
import { loadCollection } from "@/iiif";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
// import siteMap from "@repo/iiif/build/meta/sitemap.json";
import { Metadata } from "next";
import { getValue } from "@iiif/helpers";
import { baseURL, makeTitle, getDefaultMetaMdx } from "@/helpers/metadata";

export async function generateMetadata({
  params,
}: {
  params: { collection: string; locale: string };
}): Promise<Metadata> {
  const t = await getTranslations();
  const slug = `collections/${params.collection}`;
  const { collection } = await loadCollection(slug);
  const defaultMeta = getDefaultMetaMdx({ params: { locale: params.locale } });
  const collTitle = getValue(collection.label, { language: params.locale, fallbackLanguages: ["nl", "en"] });
  const description =
    getValue(collection.summary, { language: params.locale, fallbackLanguages: ["nl", "en"] }) ??
    defaultMeta.description;
  const title = makeTitle([collTitle, defaultMeta.title]);
  const url = `/collections/${params.collection}`;
  // this page currently uses the default meta image as a 'collection image' is not available.
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
          url: defaultMeta.image ?? "",
          width: defaultMeta.imageWidth,
          height: defaultMeta.imageHeight,
        },
      ],
    },
  };
}

export default async function Collection({ params }: { params: { collection: string; locale: string } }) {
  setRequestLocale(params.locale);
  const slug = `collections/${params.collection}`;
  const { collection, meta } = await loadCollection(slug);

  return (
    <Page>
      <CollectionPage collection={collection as any} meta={meta as any} slug={slug} />
    </Page>
  );
}

// // Which collections should be generated at build time?
// This doesn't work locally unless you have the test server loaded. Leaving this off for now.
// export function getStaticPaths() {
//   const collections = Object.entries(siteMap)
//     .filter(([slug, obj]) => obj.type === "Collection")
//     .map(([slug, obj]) => {
//       return {
//         params: {
//           slug: slug.replace("collections/", ""),
//         },
//       };
//     });

//   const paths = [];
//   for (const collection of collections) {
//     paths.push({
//       params: {
//         collection: collection.params.slug,
//         locale: "en",
//       },
//     });
//     paths.push({
//       params: {
//         collection: collection.params.slug,
//         locale: "nl",
//       },
//     });
//   }

//   return {
//     paths,
//     fallback: true,
//   };
// }
