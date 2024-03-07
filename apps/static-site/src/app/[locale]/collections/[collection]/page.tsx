import { CollectionPage } from "@/components/pages/CollectionPage";
import { loadCollection } from "@/iiif";
import { Page } from "@/components/Page";
import { unstable_setRequestLocale } from "next-intl/server";
import siteMap from "@repo/iiif/build/meta/sitemap.json";

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
