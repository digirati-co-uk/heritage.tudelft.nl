import imageServiceLinks from "@repo/iiif/build/meta/image-service-links.json";
import { allPublications } from "contentlayer/generated";

export function getArticlesForObject(slug: string) {
  return allPublications.filter((publication) => {
    if (publication.referencedIIIF.includes(slug)) {
      return true;
    }

    // Image service check.
    for (const pub of publication.referencedIIIF) {
      const links = imageServiceLinks[pub as keyof typeof imageServiceLinks];
      if (links) {
        for (const link of links) {
          if (link.slug === slug) {
            return true;
          }
        }
      }
    }

    return false;
  });
}
