import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  addReference,
  batchActions,
  changeReferenceIdentifier,
  importEntities,
  removeReference,
} from "@iiif/helpers/vault/actions";
import { toRef } from "@iiif/parser";
import type { Enrichment } from "../util/enrich";

export const filesRewrite: Enrichment = {
  id: "enrich-files-rewrite",
  name: "Rewrite local paths to files",
  types: ["Manifest"],
  async invalidate(resource, api) {
    return true;
  },
  async handler(resource, api) {
    if (resource.id) {
      const meta = await api.meta.value;
      if (!meta.files?.length) return {};

      const found = api.builder.vault.get(resource.id);
      if (!found?.id) {
        return {};
      }

      const configUrl = typeof api.config.server === "string" ? api.config.server : api.config.server?.url;

      const slug = resource.slug.split("/").pop();

      const validFiles = Object.fromEntries(
        meta.files.flatMap((file: string) => {
          return [
            [file, file],
            [`./${file}`, file],
            [`${slug}/${file}`, file],
            [`./${slug}/${file}`, file],

            // Other possible formats.
            // [`file:./${file}`, file],
            // [`file:./${resource.slug}/${file}`, file],
          ];
        })
      );

      // This is the reduced list of items to check based on the Manifest.
      const toSearch = [
        // The manifest itself.
        found,
        // The manifest items.
        ...api.builder.vault.get(found.items || []),
      ];

      let didChange = false;

      const filesInManifest: string[] = [];

      for (const currentItem of toSearch) {
        for (const property of ["thumbnail", "seeAlso", "rendering", "annotations"]) {
          if (currentItem[property]?.length) {
            for (const item of currentItem[property]) {
              const validFile = validFiles[toRef(item)!.id];
              if (validFile) {
                // We need to remove the entity and re-add it back.
                const index = currentItem[property].indexOf(item);
                didChange = true;
                filesInManifest.push(validFile);
                api.builder.vault.dispatch(
                  changeReferenceIdentifier({
                    id: currentItem.id,
                    type: currentItem.type,
                    index: index,
                    key: property,
                    newIdentifier: `${configUrl}/${resource.slug}/${validFile}`,
                    reference: item,
                  })
                );
              }
            }
          }
        }
      }

      // Here we can handle the fileDetails.
      const filesForResource = meta.files.filter((file: string) => {
        if (resource.type === "Canvas") {
          return true;
        }

        return !file.startsWith("canvases/");
      });
      const details = meta.filesDetail || ({} as Record<string, Record<string, any>>);
      for (const file of filesForResource) {
        const detail = details[file];
        if (!detail) continue;

        const { _injectId, property, ...resourceProps } = detail || {};

        if (!filesInManifest.includes(file) && property) {
          // @todo go in and patch them into the Manifest if they are not already.
          const fileId = `${configUrl}/${resource.slug}/${file}`;

          // Check the property.
          const resourceAlreadyExists = (found[property] || []).find((item: any) => {
            return toRef(item)?.id === fileId || item["@id"] === fileId;
          });

          if (!resourceAlreadyExists) {
            api.builder.vault.dispatch(
              importEntities({
                entities: {
                  ContentResource: {
                    [fileId]: { ...resourceProps, id: fileId },
                  },
                },
              })
            );
            api.builder.vault.dispatch(
              addReference({
                id: found.id,
                type: found.type,
                key: property,
                reference: { id: fileId, type: "ContentResource" },
              })
            );

            didChange = true;
          }
        }

        if (detail._injectId) {
          // We need to patch the file on disk with a new id.
          const idProperty = typeof detail._injectId === "string" ? detail._injectId : "id";

          try {
            const filePath = join(api.files, file);
            if (!existsSync(filePath)) {
              continue;
            }

            const fileJson = (await api.fileHandler.loadJson(filePath)) as any;

            fileJson[idProperty] = `${configUrl}/${resource.slug}/${file}`;

            await api.fileHandler.saveJson(filePath, fileJson);
          } catch (e) {
            console.error("Error patching file", e);
            // We will ignore errors for now.
          }
        }
      }

      return { didChange };
    }

    return {};
  },
};
