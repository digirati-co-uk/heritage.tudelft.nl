import { CollectionPage } from "@/components/pages/CollectionPage";
import { loadCollection, loadCollectionMeta } from "@/iiif";
import { Page } from "@/components/Page";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
// import siteMap from "@repo/iiif/build/meta/sitemap.json";
import { Metadata } from "next";
import { getValue } from "@iiif/helpers";
import { getSiteName, getMetadata } from "@/helpers/metadata";

export async function generateMetadata({
  params,
}: {
  params: { collection: string; locale: string };
}): Promise<Metadata> {
  const t = await getTranslations();
  const slug = `collections/${params.collection}`;
  const meta = await loadCollectionMeta(slug);
  const siteName = await getSiteName();
  const collTitle = getValue(meta.intlLabel, { language: params.locale, fallbackLanguages: ["nl", "en"] });
  const description = getValue(meta.intlSummary, { language: params.locale, fallbackLanguages: ["nl", "en"] });
  const title = `${collTitle} | ${siteName}`;
  return getMetadata(params.locale, siteName, title, description);
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
