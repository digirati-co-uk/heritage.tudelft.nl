export interface SlugConfig {
  type: "Manifest" | "Collection";
  domain: string;
  prefix?: string;
  suffix?: string;
  examples?: string[];
  protocol?: string;
  pathSeparator?: string;
  addedPrefix?: string;
}

export type CompiledSlugConfig = (
  url: string,
) => readonly [string, Record<string, string>] | readonly [null, null];

const NO_MATCH = [null, null] as const;
export function compileSlugConfig(config: SlugConfig): CompiledSlugConfig {
  if ((config as any).pattern) {
    throw new Error(`config.pattern is no longer supported.`);
  }

  return (slug: string) => {
    const slugUrl = new URL(slug);
    if (slugUrl.hostname !== config.domain) {
      return NO_MATCH;
    }

    const path = slugUrl.pathname;
    if (config.prefix && !path.startsWith(config.prefix)) {
      return NO_MATCH;
    }

    if (config.suffix && !path.endsWith(config.suffix)) {
      return NO_MATCH;
    }

    const pathWithoutPrefix = config.prefix
      ? path.slice(config.prefix.length)
      : path;

    let pathWithoutSuffix = config.suffix
      ? pathWithoutPrefix.slice(0, -config.suffix.length)
      : pathWithoutPrefix;

    if (pathWithoutSuffix.startsWith("/")) {
      pathWithoutSuffix = pathWithoutSuffix.slice(1);
    }

    if (config.pathSeparator) {
      pathWithoutSuffix = pathWithoutSuffix.replaceAll(
        "/",
        config.pathSeparator,
      );
    }

    if (config.addedPrefix) {
      pathWithoutSuffix = config.addedPrefix + pathWithoutSuffix;
    }

    return [pathWithoutSuffix, { path: pathWithoutSuffix }] as const;
  };
}

function removeTrailingSlash(str: string) {
  if (str.endsWith("/")) {
    return str.slice(0, -1);
  }
  return str;
}

export function compileReverseSlugConfig(
  config: SlugConfig,
): CompiledSlugConfig {
  const pathSeparator = config.pathSeparator
    ? new RegExp(config.pathSeparator, "g")
    : null;
  return (targetPath: string) => {
    const domain = removeTrailingSlash(config.domain);
    let path = removeTrailingSlash(targetPath);
    const prefix = config.prefix || "";
    const suffix = config.suffix || "";

    if (path.startsWith("/")) {
      path = path.slice(1);
    }

    if (path.startsWith("manifests/")) {
      path = path.slice("manifests/".length);
    }
    if (path.startsWith("collections/")) {
      path = path.slice("collections/".length);
    }

    if (config.addedPrefix) {
      if (!path.startsWith(config.addedPrefix)) {
        return NO_MATCH;
      }
      path = path.slice(config.addedPrefix.length);
    }

    const parts = [`${config.protocol || "https"}://${domain}`];
    if (prefix) {
      parts.push(prefix);
    }
    if (pathSeparator) {
      parts.push(path.replace(pathSeparator, "/"));
    } else {
      parts.push(path);
    }
    if (suffix) {
      parts.push(suffix);
    }

    return [parts.join(""), { path }] as const;
  };
}
