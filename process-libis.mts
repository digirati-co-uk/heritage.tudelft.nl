import { readdir } from "node:fs/promises";
import { cwd } from "node:process";
import { join } from "node:path";

const manifestsToProcess = [
  // Add new lines for more manifests to process
  ...(await readdir(join(cwd(), "apps/iiif/manifests/collective-access/objects"))).map((r) => {
    return join(cwd(), "apps/iiif/manifests/collective-access/objects", r);
  }),
];

for (const manifestPath of manifestsToProcess) {
  const file = Bun.file(manifestPath);

  try {
    const manifestJson = await file.json();
    if (manifestJson && !manifestJson.label && manifestJson.metadata) {
      const foundMetadata = manifestJson.metadata.find((m: any) => m.label === "Titel" || m.label === "Title");
      if (foundMetadata && foundMetadata.value) {
        manifestJson.label = foundMetadata.value;
        await Bun.write(file, JSON.stringify(manifestJson, null, 2));
      }
    }

    console.log(manifestPath);
  } catch (e) {
    console.error(e);
  }
}
