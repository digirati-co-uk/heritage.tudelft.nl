import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";
import type { Command } from "commander";
import { supportedConfigFiles } from "../util/get-config.ts";

type InitOptions = unknown;

export async function initCommand(options: InitOptions, command: Command) {
  // Check if any of the supported configs exist.
  for (const config of supportedConfigFiles) {
    if (existsSync(join(cwd(), config))) {
      console.log(`Found config file: ${config}`);
      return;
    }
  }

  const configFile = join(cwd(), ".iiifrc.yml");
  console.log(`Creating config file: ${configFile}`);
  // language=yaml
  await writeFile(
    configFile,
    `
server:
  url: http://localhost:7111

stores:
  manifests:
    type: iiif-json
    path: ./content
    pattern: "**/*.json"
    destination: manifests
    base: ./content

  cookbook-example:
    type: iiif-remote
    url: https://iiif.io/api/cookbook/recipe/0005-image-service/manifest.json
    overrides: ./content
    saveManifests: true
    slugTemplates:
      - iiif-cookbook-slug

slugs:
  iiif-cookbook-slug:
    type: Manifest
    prefix: https://iiif.io/api/cookbook/
    pattern: /recipe/:name/manifest.json
    slugTemplate: manifests/:name
    examples:
      - https://iiif.io/api/cookbook/recipe/0001-mvm-image/manifest.json
`
  );

  await mkdir(join(cwd(), "content"), { recursive: true });
  // Example cookbook

  if (!existsSync(join(cwd(), "content", "0001-mvm-image.json"))) {
    await writeFile(
      join(cwd(), "content", "0001-mvm-image.json"),
      `{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "https://iiif.io/api/cookbook/recipe/0001-mvm-image/manifest.json",
  "type": "Manifest",
  "label": {
    "en": [
      "Single Image Example"
    ]
  },
  "items": [
    {
      "id": "https://iiif.io/api/cookbook/recipe/0001-mvm-image/canvas/p1",
      "type": "Canvas",
      "height": 1800,
      "width": 1200,
      "items": [
        {
          "id": "https://iiif.io/api/cookbook/recipe/0001-mvm-image/page/p1/1",
          "type": "AnnotationPage",
          "items": [
            {
              "id": "https://iiif.io/api/cookbook/recipe/0001-mvm-image/annotation/p0001-image",
              "type": "Annotation",
              "motivation": "painting",
              "body": {
                "id": "http://iiif.io/api/presentation/2.1/example/fixtures/resources/page1-full.png",
                "type": "Image",
                "format": "image/png",
                "height": 1800,
                "width": 1200
              },
              "target": "https://iiif.io/api/cookbook/recipe/0001-mvm-image/canvas/p1"
            }
          ]
        }
      ]
    }
  ]
}`
    );
  }

  await mkdir(join(cwd(), "scripts"), { recursive: true });

  await writeFile(
    join(cwd(), "scripts", "example.js"),
    `
import { extract } from "hss-iiif";

extract(
  {
    id: "testing-js-extract",
    name: "testing js extract",
    types: ["Manifest"],
  },
  async (resource, api) => {
    console.log('extracting', resource.id);
    return {};
  },
);

`
  );

  console.log("Done!");
}
