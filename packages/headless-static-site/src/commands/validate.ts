import { Command } from "commander";
import { getConfig } from "../util/get-config.ts";
import {
  compileReverseSlugConfig,
  compileSlugConfig,
} from "../util/slug-engine.ts";
import chalk from "chalk";
import { cwd } from "node:process";
import { join } from "node:path";
import { existsSync } from "fs";
import { resolveFromSlug } from "../util/resolve-from-slug.ts";

interface ValidateOptions {}
export async function validate(options: ValidateOptions, command?: Command) {
  let didError = false;
  const config = await getConfig();
  if (config.slugs) {
    const slugs = Object.keys(config.slugs);
    for (const slugName of slugs) {
      const slug = config.slugs[slugName];
      if (!slug.examples) {
        didError = true;
        console.log(chalk.red`  - Slug ${slugName} is missing examples\n`);
        continue;
      }

      const compiled = compileSlugConfig(slug);
      const reverse = compileReverseSlugConfig(slug);

      for (const example of slug.examples) {
        const prefix = chalk.gray(`[${slugName}]`) + ` ${example}`;

        const [result] = compiled(example);
        if (!result) {
          didError = true;
          console.log(chalk.red(prefix), chalk.red` ⨯ failed to compile`);
          continue;
        }
        const [reverseResult] = reverse(result);
        if (!reverseResult || reverseResult !== example) {
          didError = true;
          console.log(chalk.red(prefix), chalk.red`⨯ failed to reverse`);
          console.log(
            `\n    Found:    ${reverseResult}\n    Expected: ${example} \n`,
          );
          continue;
        }

        console.log(chalk.green`✔ `, prefix);
      }
    }
  }
  console.log("");

  const buildMeta = join(cwd(), ".iiif/build/meta/sitemap.json");
  if (config.slugs && existsSync(buildMeta)) {
    console.log("Validating built site map");
    const loaded = await Bun.file(buildMeta).json();
    const keys = Object.keys(loaded);
    for (const key of keys) {
      const item = loaded[key];
      const resolved = resolveFromSlug(key, item.type, config.slugs, false);
      if (resolved) {
        // Good, we found a single match.
      } else {
        // This MUST be local.
        if (item.type === "Manifest") {
          const expectedPath = join(cwd(), ".iiif/build", key, "manifest.json");
          if (!existsSync(expectedPath)) {
            console.log(chalk.red`  - Missing ${key} at ${expectedPath}`);
          }
        }
        if (item.type === "Collection") {
          const expectedPath = join(
            cwd(),
            ".iiif/build",
            key,
            "collection.json",
          );
          if (!existsSync(expectedPath)) {
            console.log(chalk.red`  - Missing ${key} at ${expectedPath}`);
            didError = true;
          }
        }
      }
    }

    if (!didError) {
      console.log(chalk.green`✔ `, `Checked ${keys.length} paths`);
    }
  }

  if (didError) {
    console.log("\n", chalk.red`⨯ Validation failed`);
    process.exit(1);
  }
}
