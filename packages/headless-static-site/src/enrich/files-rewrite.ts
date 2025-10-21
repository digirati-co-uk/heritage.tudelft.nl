import { toRef } from "@iiif/parser";
import type { Enrichment } from "../util/enrich";
import {
  removeReference,
  addReference,
  importEntities,
  batchActions,
  changeReferenceIdentifier,
} from "@iiif/helpers/vault/actions";

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
      if (!found) {
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

      for (const currentItem of toSearch) {
        for (const property of ["thumbnail", "seeAlso", "service", "services", "rendering", "annotations"]) {
          if (currentItem[property]?.length) {
            for (const item of currentItem[property]) {
              const validFile = validFiles[toRef(item)!.id];
              if (validFile) {
                // We need to remove the entity and re-add it back.
                const index = currentItem[property].indexOf(item);
                didChange = true;

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

      return { didChange };
    }

    return {};
  },
};
