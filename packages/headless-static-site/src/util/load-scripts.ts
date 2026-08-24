import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import chalk from "chalk";
import { pythonExtract } from "./python-api.ts";
import { readAllFiles } from "./read-all-files.ts";

export async function getScriptImportSpecifier(file: string) {
  const source = await readFile(file);
  const version = createHash("sha1").update(source).digest("hex");
  const fileUrl = pathToFileURL(file).href;
  return `${fileUrl}?v=${version}`;
}

export async function loadScripts(
  options: { scripts?: string; python?: boolean; debug?: boolean; cwd?: string },
  log: (text: string) => void = () => void 0
) {
  // Load external configs / scripts.
  if (options.scripts) {
    const scriptsPath = resolve(options.cwd || cwd(), options.scripts);
    let loaded = 0;
    if (existsSync(scriptsPath)) {
      const allFiles = Array.from(readAllFiles(scriptsPath)).filter((s) => !s.endsWith("/hss.py"));
      log(`Loading ${allFiles.length} script(s)`);
      for (const file of allFiles) {
        if (file.endsWith("extract.py")) {
          if (options.python) {
            loaded++;
            await pythonExtract(file, options.debug);
          }
          // wrap enrichments in a function
          continue;
        }
        if (file.endsWith(".py")) {
          continue;
        }

        try {
          const importSpecifier = await getScriptImportSpecifier(file);
          await import(importSpecifier);
          loaded++;
        } catch (e) {
          console.log(chalk.red(e));
          process.exit(1);
        }
      }
      if (loaded !== allFiles.length) {
        log(chalk.yellow(`Loaded ${loaded} of ${allFiles.length} scripts`));
      }
    }
  }
}
