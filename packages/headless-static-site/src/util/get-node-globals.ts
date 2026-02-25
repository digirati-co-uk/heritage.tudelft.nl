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

  if (g.__hss) {
    if (g.__hss.extractions) {
      extractions.push(...g.__hss.extractions);
    }
    if (g.__hss.enrichments) {
      enrichments.push(...g.__hss.enrichments);
    }
    if (g.__hss.linkers) {
      linkers.push(...g.__hss.linkers);
    }
    if (g.__hss.rewrites) {
      rewrites.push(...g.__hss.rewrites);
    }
    if (g.__hss.generators) {
      generators.push(...g.__hss.generators);
    }
  }
  return { extractions, enrichments, linkers, rewrites, generators };
}
