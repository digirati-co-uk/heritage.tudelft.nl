import { getImageServiceLinks } from "@/iiif";
import type { Publication } from "contentlayer/generated";

export async function getObjectsForArticle(publication: Publication) {
  const imageServiceLinks = await getImageServiceLinks();
  const objects = [];
  for (const slug of publication.referencedIIIF) {
    const links = imageServiceLinks[slug as keyof typeof imageServiceLinks];
    if (links) {
      for (const link of links) {
        objects.push(link);
      }
    }
  }
  return objects;
}
