import { join, relative } from "node:path";

export function rewritePath(config: { base?: string; destination?: string }) {
  return (inputPath: string) => {
    let currentPath = inputPath;
    if (config.base) {
      currentPath = relative(config.base, currentPath);
    }

    if (config.destination) {
      currentPath = join(config.destination, currentPath);
    }

    if (currentPath.endsWith("_collection.yml") || currentPath.endsWith("_collection.yaml")) {
      return currentPath.replace(/\/_collection\.(yml|yaml)$/, "");
    }

    // Remove extension.
    return currentPath.replace(/\.[A-Za-z0-9]+$/, "");
  };
}
