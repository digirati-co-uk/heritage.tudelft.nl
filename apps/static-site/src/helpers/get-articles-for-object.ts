import { getImageServiceLinks } from "@/iiif";
import { allPublications } from "contentlayer/generated";

export async function getArticlesForObject(slug: string) {
  const imageServiceLinks = await getImageServiceLinks();

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
