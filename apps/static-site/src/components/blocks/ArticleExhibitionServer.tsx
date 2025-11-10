import { getSlugFromRelativeUrl } from "@/helpers/get-slug-from-relative-url";
import { getViewObjectLinks } from "@/helpers/get-view-object-links";
import { DevEditManifest } from "../atoms/DevEditManifest";
import { ArticleExhibition, type ArticleExhibitionProps } from "./ArticleExhibition";

export async function ArticleExhibitionServer(props: ArticleExhibitionProps) {
  const slug = getSlugFromRelativeUrl(props.manifest);
  const viewObjectLinks = await getViewObjectLinks(slug);

  return (
    <>
      <ArticleExhibition {...props} viewObjectLinks={viewObjectLinks} />
      {slug && <DevEditManifest slug={slug} />}
    </>
  );
}
