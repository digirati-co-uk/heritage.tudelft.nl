import type { Enrichment } from "./enrich";
import type { Extraction } from "./extract";
import type { IIIFGenerator } from "./iiif-generator.ts";
import type { Linker } from "./linker.ts";
import type { Rewrite } from "./rewrite.ts";

declare interface Global {
  __hss?: {
    extractions?: Extraction[];
    enrichments?: Enrichment[];
    linkers?: Linker[];
    rewrites?: Rewrite[];
    generators?: IIIFGenerator[];
  };
}

export function getNodeGlobals() {
  const extractions: Extraction[] = [];
  const enrichments: Enrichment[] = [];
  const linkers: Linker[] = [];
  const rewrites: Rewrite[] = [];
  const generators: IIIFGenerator[] = [];

  const g = global as Global;

  function dedupeById<T extends { id?: string }>(items: T[]) {
    const deduped: T[] = [];
    const byId = new Map<string, number>();

    for (const item of items) {
      if (!item?.id) {
        deduped.push(item);
        continue;
      }
      const existingIndex = byId.get(item.id);
      if (typeof existingIndex === "number") {
        deduped[existingIndex] = item;
      } else {
        byId.set(item.id, deduped.length);
        deduped.push(item);
      }
    }

    return deduped;
  }

  if (g.__hss) {
    if (g.__hss.extractions) {
      extractions.push(...dedupeById(g.__hss.extractions as Array<Extraction & { id?: string }>));
    }
    if (g.__hss.enrichments) {
      enrichments.push(...dedupeById(g.__hss.enrichments as Array<Enrichment & { id?: string }>));
    }
    if (g.__hss.linkers) {
      linkers.push(...dedupeById(g.__hss.linkers as Array<Linker & { id?: string }>));
    }
    if (g.__hss.rewrites) {
      rewrites.push(...dedupeById(g.__hss.rewrites as Array<Rewrite & { id?: string }>));
    }
    if (g.__hss.generators) {
      generators.push(...dedupeById(g.__hss.generators as Array<IIIFGenerator & { id?: string }>));
    }
  }
  return { extractions, enrichments, linkers, rewrites, generators };
}
