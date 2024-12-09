import { join } from "node:path";
import { cwd } from "node:process";
import { existsSync } from "fs";
import { readAllFiles } from "./read-all-files.ts";
import { pythonExtract } from "./python-api.ts";
import chalk from "chalk";

export async function loadScripts(
  options: { scripts?: string; python?: boolean; debug?: boolean },
  log: (text: string) => void = () => void 0,
) {
  // Load external configs / scripts.
  if (options.scripts) {
    const scriptsPath = join(cwd(), options.scripts);
    let loaded = 0;
    if (existsSync(scriptsPath)) {
      const allFiles = Array.from(readAllFiles(scriptsPath)).filter(
        (s) => !s.endsWith("/hss.py"),
      );
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
          await import(file);
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
