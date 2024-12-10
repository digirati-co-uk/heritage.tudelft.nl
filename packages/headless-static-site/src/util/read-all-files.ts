import { readdirSync } from "node:fs";
import { join } from "node:path";

export function* readAllFiles(dir: string): Generator<string> {
  const files = readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    if (file.isDirectory()) {
      yield* readAllFiles(join(dir, file.name));
    } else {
      yield join(dir, file.name);
    }
  }
}
