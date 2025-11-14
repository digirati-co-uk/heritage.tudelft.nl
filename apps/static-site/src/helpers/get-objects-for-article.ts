import imageServiceLinks from "@repo/iiif/build/meta/image-service-links.json";
import type { Publication } from "contentlayer/generated";

export function getObjectsForArticle(publication: Publication) {
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
