import { readAllFiles } from "./read-all-files.ts";
import micromatch from "micromatch";

export function readFilteredFiles(store: {
  path: string;
  pattern?: string;
  ignore?: string | string[];
}) {
  const allStoreFiles = readAllFiles(store.path);
  const allFiles = Array.from(allStoreFiles);
  if (store.pattern || store.ignore) {
    return micromatch(allFiles, store.pattern || "**/*", {
      ignore: store.ignore,
    });
  }
  return allFiles;
}
