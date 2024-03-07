import { client, getExhibitions, loadImageServiceLinks, loadJson, loadRelated } from "@/iiif";
import { Page } from "@/components/Page";
import { ExhibitionPage } from "@/components/pages/ExhibitionPage";
import { unstable_setRequestLocale } from "next-intl/server";
import { ManifestLoader } from "@/app/provider";

const imageServiceLinks = await loadImageServiceLinks();

export const generateStaticParams = async () => {
  const exhibitions = [];
  const loaded = await getExhibitions();
  for (const item of loaded.items) {
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
  const data = await client.loadManifest(`/${manifestSlug}`);
  const meta = await loadJson(data.meta);
  const manifest = await loadJson(data.manifest);
  const viewObjectLinks = imageServiceLinks[manifestSlug] || [];

  return (
    <Page>
      <ManifestLoader manifest={manifest}>
        <ExhibitionPage
          manifest={manifest as any}
          meta={meta as any}
          slug={params.exhibition}
          viewObjectLinks={viewObjectLinks}
        />
      </ManifestLoader>
    </Page>
  );
}
