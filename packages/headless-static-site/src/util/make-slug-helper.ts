import type { BuildConfig } from "../commands/build.ts";
import type { GenericStore } from "./get-config.ts";
import { compileSlugConfig } from "./slug-engine.ts";

function getDefaultSlug(slug: string) {
  const url = new URL(slug);
  let path = url.pathname.replace(/\/+$/, "");
  let suffix = "";

  if (/\/manifest\.json$/i.test(path)) {
    path = path.replace(/\/manifest\.json$/i, "");
    suffix = "manifest.json";
  } else if (/\/collection\.json$/i.test(path)) {
    path = path.replace(/\/collection\.json$/i, "");
    suffix = "collection.json";
  } else if (/\.json$/i.test(path)) {
    path = path.replace(/\.json$/i, "");
    suffix = "json";
  }

  path = path.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!path) {
    path = url.hostname;
  }

  return [path, `default:${url.hostname}/${suffix}`] as const;
}

function ensureTypePrefix(slug: string, type: string) {
  if (type === "Manifest") {
    if (slug.startsWith("manifests/")) {
      console.log(
        'Warning: Manifest slug should not start with "manifests/". Consider adding it to the prefix in the slug config'
      );
      return slug;
    }
    return `manifests/${slug}`;
  }

  if (type === "Collection") {
    if (slug.startsWith("collections/")) {
      console.log(
        'Warning: Collection slug should not start with "collections/". Consider adding it to the prefix in the slug config'
      );
      return slug;
    }
    return `collections/${slug}`;
  }

  return slug;
}

function getInlineTemplates(store: GenericStore) {
  const inlineTemplate = store.slugTemplate;
  if (!inlineTemplate) {
    return [];
  }
  return Array.isArray(inlineTemplate) ? inlineTemplate : [inlineTemplate];
}

export function makeGetSlugHelper(store: GenericStore, slugs: BuildConfig["slugs"]) {
  const referencedTemplates = (store.slugTemplates || []).flatMap((slugTemplate) => {
    const compiled = slugs[slugTemplate];
    if (!compiled) {
      return [];
    }
    return [{ name: slugTemplate, compiled }];
  });

  const inlineTemplates = getInlineTemplates(store).map((inlineTemplate, index) => {
    return {
      name: `inline-slug-template-${index + 1}`,
      compiled: {
        info: inlineTemplate,
        compile: compileSlugConfig(inlineTemplate),
      },
    };
  });

  const templates = [...referencedTemplates, ...inlineTemplates];

  if (templates.length > 0) {
    return (resource: { id: string; type: string }) => {
      for (const template of templates) {
        if (template.compiled.info.type !== resource.type) {
          continue;
        }

        const [slug] = template.compiled.compile(resource.id);
        if (slug) {
          return [ensureTypePrefix(slug, resource.type), template.name] as const;
        }
      }
      return getDefaultSlug(resource.id);
    };
  }
  return (resource: { id: string; type: string }) => {
    return getDefaultSlug(resource.id);
  };
}
