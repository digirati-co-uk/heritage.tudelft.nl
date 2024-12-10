import type { BuildConfig } from "../commands/build.ts";
import type { GenericStore } from "./get-config.ts";

function getDefaultSlug(slug: string) {
  const url = new URL(slug);
  let path = url.pathname;
  let extension = "";

  const parts = path.split(".");
  const lastPart = parts[parts.length - 1];
  if (lastPart.indexOf(".") !== -1) {
    const pathParts = path.split(".");
    extension = pathParts.pop() || "";
    path = pathParts.join(".");
  }

  return [path, `default:${url.hostname}/${extension}`] as const;
}
export function makeGetSlugHelper(store: GenericStore, slugs: BuildConfig["slugs"]) {
  if (store.slugTemplates) {
    return (resource: { id: string; type: string }) => {
      const isManifest = resource.type === "Manifest";
      const isCollection = resource.type === "Collection";
      for (const slugTemplate of store.slugTemplates || []) {
        const compiled = slugs[slugTemplate];
        if (compiled && compiled.info.type === resource.type) {
          let [slug] = compiled.compile(resource.id);
          if (slug) {
            if (isManifest && slug.startsWith("manifests/")) {
              console.log(
                'Warning: Manifest slug should not start with "manifests/". Consider adding it to the prefix in the slug config'
              );
            }
            if (isCollection && slug.startsWith("collections/")) {
              console.log(
                'Warning: Collection slug should not start with "collections/". Consider adding it to the prefix in the slug config'
              );
            }

            if (isManifest && !slug.startsWith("manifests/")) {
              slug = `manifests/${slug}`;
            }
            if (isCollection && !slug.startsWith("collections/")) {
              slug = `collections/${slug}`;
            }

            return [slug, slugTemplate] as const;
          }
        }
      }
      return getDefaultSlug(resource.id);
    };
  }
  return (resource: { id: string; type: string }) => {
    return getDefaultSlug(resource.id);
  };
}
