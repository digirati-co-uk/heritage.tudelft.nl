import type { Enrichment } from "../util/enrich";
import { buildLocaleString } from "@iiif/helpers";
import translate from "translate";
import fetch from "node-fetch";

global.fetch = global.fetch || (fetch as any);

// @todo make this options.
// const langs = ['fr', 'uk', 'de'];
const langs: string[] = []; // empty to speed things up..
export const translateMetadata: Enrichment = {
  id: "translate-metadata",
  name: "Translate metadata",
  types: ["Manifest"],
  async invalidate(resource, api) {
    const caches = await api.caches.value;
    const cacheKeys = langs.map((l) => `metadata_${l}`);
    for (const lang of cacheKeys) {
      if (!caches[lang]) {
        return true;
      }
    }
    return false;
  },
  async handler(resource, api) {
    const metadata = api.resource.metadata;
    if (!metadata || langs.length === 0) return {};

    const getValue = (inputText: string) => buildLocaleString(inputText, "en");

    const metadataToTranslate = metadata
      .map((m: any) => {
        return `${getValue(m.label)}\n---\n${getValue(m.value)}`;
      })
      .join("\n----\n");

    const translated: Record<string, string> = {};
    const cache = await api.caches.value;

    let newMetadata = [...metadata];
    for (const lang of langs) {
      translated[lang] =
        cache[`metadata_${lang}`] ||
        (await translate(metadataToTranslate, { to: lang }));
      newMetadata = translated[lang].split("\n----\n").map((m, k) => {
        const existing = newMetadata[k];
        const [label, value] = m.split("\n---\n");

        return {
          label: { ...(existing.label || {}), [lang]: [label] },
          value: { ...(existing.value || {}), [lang]: [value] },
        };
      });
    }

    api.builder.editManifest(resource.id, (m: any) => {
      m.setMetadata(newMetadata);
    });

    const langCaches: Record<string, string> = {};
    for (const lang of langs) {
      langCaches[`metadata_${lang}`] = translated[lang];
    }

    return {
      didChange: true,
      caches: {
        ...langCaches,
      },
    };
  },
};
