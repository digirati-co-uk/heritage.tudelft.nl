import { Page } from "@/components/Page";
import { ServerCollectionSplashImage } from "@/components/iiif/CollectionSplashImage.server";
import { FeaturedCollectionCardList } from "@/components/iiif/FeaturedCollectionCardList";
import { ObjectThumbnails } from "@/components/iiif/ObjectThumbnails";
import { AutoLanguage } from "@/components/pages/AutoLanguage";
import { Link } from "@/i18n/navigation";
import { loadCollection } from "@/iiif";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { LocaleString, SingleCanvasThumbnail } from "react-iiif-vault";

export default async function Collections2Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { collection: collectionData, meta } = await loadCollection("featured");

  if (!collectionData) return null;

  // https://heritage.tudelft.nl/iiif/manifests/fb59072f-be4a-4d3d-8870-41c258b2e1aa/manifest.json

  return (
    <div className="p-0 w-full flex flex-col items-center">
      <ServerCollectionSplashImage
        className="min-h-[80vh] lg:min-h-[70vh] flex flex-col w-full justify-center h-full overflow-hiddenffghh"
        manifest="https://heritage.tudelft.nl/iiif/manifests/fb59072f-be4a-4d3d-8870-41c258b2e1aa/manifest.json"
        crop={{ x: 1169, y: 1465, w: 992, h: 598 }}
        cropMobile={{ x: 655, y: 941, w: 2715, h: 2678 }}
        canvas={0}
      >
        <nav className="text-white m-auto w-full max-w-screen-xl px-5 py-10 lg:px-10">
          {/*<ul className="flex gap-4">
            <li>Collections</li>
            <li>Some collection name</li>
          </ul>*/}
        </nav>
        <div className="flex-1 w-full" />
        <div className="text-white m-auto w-full max-w-screen-xl px-5 py-10 lg:px-10 lg:mb-40">
          <h1 className="text-4xl lg:text-6xl mb-4 lg:mb-8 font-bold">
            <AutoLanguage>{collectionData.label}</AutoLanguage>
          </h1>
          {collectionData.summary ? (
            <p className="text-lg leading-tight lg:text-3xl max-w-3xl">
              <AutoLanguage>{collectionData.summary}</AutoLanguage>
            </p>
          ) : null}
        </div>
      </ServerCollectionSplashImage>
      <Page>
        {collectionData?.items.map((featuredCollection) =>
          featuredCollection.type !== "Collection" ? null : (
            <section
              key={featuredCollection.id}
              className="mt-24"
              id={featuredCollection["hss:slug"].replace(/collections\//g, "")}
            >
              <Link className="text-4xl mb-6 block hover:underline" href={`/${featuredCollection["hss:slug"]}`}>
                <AutoLanguage>{featuredCollection.label}</AutoLanguage>
              </Link>
              <p className="text-xl max-w-3xl my-2">
                <AutoLanguage html>{featuredCollection.summary}</AutoLanguage>
              </p>
              <FeaturedCollectionCardList
                collections={featuredCollection.items}
                background={(featuredCollection as any).background}
              />
              <Link
                href={`/${featuredCollection["hss:slug"]}`}
                className="float-right clear mt-4 text-xl font-bold underline underline-offset-4"
              >
                View all {featuredCollection.items.length} collections
              </Link>
            </section>
          ),
        )}
      </Page>
    </div>
  );
}
