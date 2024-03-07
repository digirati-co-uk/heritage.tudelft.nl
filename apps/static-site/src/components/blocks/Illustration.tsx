import { ManifestLoader } from "@/app/provider";
import { loadImageServiceLinks, loadManifest } from "@/iiif";
import { ObjectViewer } from "../iiif/ObjectViewer";
import { createThumbnailHelper } from "@iiif/helpers/thumbnail";
import { AutoLanguage } from "../pages/AutoLanguage";

// @todo make this a page block with the box loader.
export async function Illustration(props: { source: string }) {
  const uuid = props.source.split(".json")[0];
  const slug = `manifests/${uuid}`;
  const data = await loadManifest(`/${slug}`);

  const thumbnailHelper = createThumbnailHelper();
  const thumb = await thumbnailHelper.getBestThumbnailAtSize(data, { width: 512, height: 512 });
  const imageServiceLinks = await loadImageServiceLinks();
  const links = imageServiceLinks[slug] || [];
  const link = links[0] || null;

  return (
    <ManifestLoader manifest={data}>
      <div className="mb-8 grid-cols-7 md:grid">
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
          <AutoLanguage>{data.label}</AutoLanguage>
        </div>
      </div>
    </ManifestLoader>
  );
}
