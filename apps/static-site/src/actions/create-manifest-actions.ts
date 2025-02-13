"use server";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { cwd } from "node:process";

export async function createManifestBySlug(slug: string) {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  try {
    const slugWithoutPrefix = slug.replace("manifests/", "");
    const manifests = resolve(
      cwd(),
      "../iiif/manifests/manifest-editor/illustrations",
    );
    if (existsSync(manifests)) {
      console.log("Creating manifest");
      const target = join(manifests, `${slugWithoutPrefix}.json`);
      if (!existsSync(target)) {
        const newId = `manifest-editor/illustrations/${slugWithoutPrefix}.json`;
        const template = await readFile(
          resolve(cwd(), "content/illustration-template.json"),
          "utf-8",
        );
        const json = JSON.parse(template);
        json.id = newId;
        json.label = {
          en: [slugWithoutPrefix],
          nl: [slugWithoutPrefix],
        };
        await writeFile(target, JSON.stringify(json, null, 2));
        console.log("Maniest created!");
      }
    }
  } catch (e) {
    console.log(e);
  }
}
