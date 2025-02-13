import nfs from "node:fs";
import { join } from "node:path";
import type { IFS } from "unionfs";
import { lazyValue } from "./lazy-value.ts";

export async function loadJson(filePath: string, allowEmpty = false, customFs?: IFS) {
  const fs = customFs || nfs;
  if (allowEmpty) {
    if (!fs.existsSync(filePath)) {
      return {};
    }
  }

  const file = await fs.promises.readFile(filePath, "utf-8");
  const data = JSON.parse(file);
  return data;
}

export function lazyLoadJson(...filePath: string[]) {
  return lazyValue(async () => loadJson(join(...filePath)));
}

export function lazyLoadOptionalJson(...filePath: string[]) {
  return lazyValue(async () => loadJson(join(...filePath), true));
}
