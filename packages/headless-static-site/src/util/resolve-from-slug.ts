import { type SlugConfig, compileReverseSlugConfig } from "./slug-engine.ts";

export function resolveFromSlug(slug_: string, type: string, config: Record<string, SlugConfig>, quiet = true) {
  let slug = slug_;
  const candidates = [];
  const keys = Object.keys(config);
  for (const key of keys) {
    const configItem = config[key];
    if (configItem.type !== type) {
      continue;
    }

    const addedPrefix = configItem.addedPrefix
      ? configItem.addedPrefix.startsWith("/")
        ? configItem.addedPrefix
        : `/${configItem.addedPrefix}`
      : "/";
    const matchingPrefix = `${type.toLowerCase()}s${addedPrefix}`;

    if (matchingPrefix.startsWith("/") && !slug.startsWith("/")) {
      slug = `/${slug}`;
    }
    if (!matchingPrefix.startsWith("/") && slug.startsWith("/")) {
      slug = slug.slice(1);
    }

    if (!slug.startsWith(matchingPrefix)) {
      continue;
    }

    const matcher = compileReverseSlugConfig(configItem);
    const [match, vars] = matcher(slug);
    if (match) {
      candidates.push({
        match,
        vars,
        key,
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  if (candidates.length > 1 && !quiet) {
    throw new Error(`Multiple matches for slug ${slug} and type ${type}`);
  }

  return candidates[0];
}
