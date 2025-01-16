import { CollectionPage } from "@/components/pages/CollectionPage";
import { loadCollection } from "@/iiif";
import { Page } from "@/components/Page";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
// import siteMap from "@repo/iiif/build/meta/sitemap.json";
import { Metadata } from "next";
import { getValue } from "@iiif/helpers";
import { getSiteName, siteURL, fallbackImage } from "@/helpers/metadata";

export async function generateMetadata({
  params,
}: {
  params: { collection: string; locale: string };
}): Promise<Metadata> {
  const t = await getTranslations();
  const slug = `collections/${params.collection}`;
  const { collection } = await loadCollection(slug);
  const siteName = await getSiteName();
  const collTitle = getValue(collection.label, { language: params.locale, fallbackLanguages: ["nl", "en"] });
  const description = getValue(collection.summary, { language: params.locale, fallbackLanguages: ["nl", "en"] });
  const title = `${collTitle} | ${siteName}`;
  const objectURL = `${siteURL}/${params.locale}/objects/${params.collection}`;

  return {
    metadataBase: new URL(siteURL),
    description: description,
    title: title,
    openGraph: {
      locale: params.locale,
      siteName: siteName,
      title: title,
      type: "website",
      url: objectURL,
      images: [
        {
          url: fallbackImage,
          width: 1080,
        },
      ],
    },
  };
}

export default async function Collection({ params }: { params: { collection: string; locale: string } }) {
  unstable_setRequestLocale(params.locale);
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
