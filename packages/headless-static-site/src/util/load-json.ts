import { existsSync } from "node:fs";
import { join } from "node:path";
import { lazyValue } from "./lazy-value.ts";

export async function loadJson(filePath: string, allowEmpty = false) {
  if (allowEmpty) {
    if (!existsSync(filePath)) {
      return {};
    }
  }
  const file = Bun.file(filePath);
  return file.json();
}

export function lazyLoadJson(...filePath: string[]) {
  return lazyValue(async () => loadJson(join(...filePath)));
}

export function lazyLoadOptionalJson(...filePath: string[]) {
  return lazyValue(async () => loadJson(join(...filePath), true));
}
