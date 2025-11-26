import { getObjectsForArticle } from "@/helpers/get-objects-for-article";
import { Link, getObjectSlug } from "@/i18n/navigation";
import { loadManifest } from "@/iiif";
import type { Publication } from "contentlayer/generated";
import { AutoLanguage } from "../pages/AutoLanguage";

export async function ArticleFeaturedIIIF(props: { publication: Publication; content: { seeAlso: string } }) {
  if (!props.publication.seeAlso) {
    return null;
  }

  const objects = (
    await Promise.all(
      getObjectsForArticle(props.publication).map(async (item) => {
        try {
          const { manifest, meta } = await loadManifest(item.slug);
          return {
            item,
            manifest,
            meta,
          };
        } catch (error) {
          console.error(`Error loading manifest for ${item.slug}:`, error);
          return null;
        }
      }),
    )
  ).filter((e) => e);

  if (objects.length === 0) return null;

  return (
    <div className="cut-corners bg-black p-5 text-white">
      <h3 className="mb-4 text-center font-mono text-sm">{props.content.seeAlso}</h3>
      <ul className="pl-4 font-mono">
        {objects.map((object, key) => {
          if (!object) return null;
          return (
            <li key={key} className="mb-3 list-disc text-sm underline">
              <Link href={`/${getObjectSlug(object.item.slug)}?c=${object.item.targetCanvasId}`}>
                <AutoLanguage>{object.manifest.label}</AutoLanguage>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
