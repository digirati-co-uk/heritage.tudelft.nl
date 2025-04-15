import { ManifestLoader } from "@/app/provider";
import { loadManifest } from "@/iiif";
import { createThumbnailHelper } from "@iiif/helpers/thumbnail";
import imageServiceLinks from "@repo/iiif/build/meta/image-service-links.json";
import { DevCreateManifest } from "../atoms/DevCreateManifest";
import { DevEditManifest } from "../atoms/DevEditManifest";
import { ObjectViewer } from "../iiif/ObjectViewer";
import { AutoLanguage } from "../pages/AutoLanguage";

// @todo make this a page block with the box loader.
export async function Illustration(props: { source: string }) {
  const uuid = props.source.split(".json")[0];
  const slug = `manifests/${uuid}`;

  // Check if it exists.
  try {
    await loadManifest(`/${slug}`);
  } catch (e) {
    // Does not exist yet. OR display none.
    return <DevCreateManifest slug={slug} />;
  }

  const { manifest: data } = await loadManifest(`/${slug}`);

  const thumbnailHelper = createThumbnailHelper();
  const thumb = await thumbnailHelper.getBestThumbnailAtSize(data, {
    width: 512,
    height: 512,
  });
  const links = imageServiceLinks[slug as keyof typeof imageServiceLinks] || [];
  const link = links[0] || null;

  if (data.items.length === 0) {
    if (process.env.NODE_ENV === "production") {
      return null;
    }

    return (
      <div className="cut-corners flex h-96 flex-col items-center justify-center gap-3 bg-white/50 p-8">
        <DevEditManifest slug={slug} />
      </div>
    );
  }

  return (
    <ManifestLoader manifest={{ ...data }}>
      <div className="group relative mb-8 grid-cols-7 md:grid">
        <div className="cut-corners col-span-4 aspect-square bg-gray-400">
          <ObjectViewer
            className="h-full w-full cursor-pointer"
            objectLink={link?.slug}
            objectCanvasId={link?.targetCanvasId}
          >
            {thumb.best ? (
              <img
                style={{ margin: 0 }}
                className="h-full w-full object-contain transition-transform duration-1000 ease-in-out hover:scale-110"
                src={thumb.best.id}
                alt=""
              />
            ) : null}
          </ObjectViewer>
        </div>
        <div className="cut-corners col-span-3 bg-black p-8 text-white">
          <div>
            <AutoLanguage>{data.label}</AutoLanguage>
          </div>
          <div>
            <AutoLanguage>{data.summary}</AutoLanguage>
          </div>
        </div>
        {process.env.NODE_ENV !== "production" ? (
          <div className="absolute bottom-3 right-3 rounded bg-white p-3 opacity-0 transition-opacity group-hover:opacity-100">
            <DevEditManifest slug={slug} />
          </div>
        ) : null}
      </div>
    </ManifestLoader>
  );
}
