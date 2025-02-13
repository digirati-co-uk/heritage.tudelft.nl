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
      <div className="bg-white/50 p-8 gap-3 h-96 cut-corners flex-col flex items-center justify-center">
        <DevEditManifest slug={slug} />
      </div>
    );
  }

  return (
    <ManifestLoader manifest={{ ...data }}>
      <div className="mb-8 grid-cols-7 md:grid relative group">
        <div className="cut-corners col-span-4 aspect-square bg-black">
          <ObjectViewer
            className="h-full w-full cursor-pointer"
            objectLink={link?.slug}
            objectCanvasId={link?.targetCanvasId}
          >
            {thumb.best ? (
              <img
                style={{ margin: 0 }}
                className="h-full w-full object-cover transition-transform duration-1000 ease-in-out hover:scale-110"
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
          <div className="bg-white p-3 rounded transition-opacity group-hover:opacity-100 opacity-0 absolute bottom-3 right-3">
            <DevEditManifest slug={slug} />
          </div>
        ) : null}
      </div>
    </ManifestLoader>
  );
}
