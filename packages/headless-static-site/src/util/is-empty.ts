import { readdirSync } from "node:fs";

export function isEmpty(path: string) {
  return readdirSync(path).length === 0;
}
