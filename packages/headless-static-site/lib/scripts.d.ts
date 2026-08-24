import type { Enrichment } from "../src/util/enrich.ts";
import type { Extraction } from "../src/util/extract.ts";
import type { IIIFGenerator } from "../src/util/iiif-generator.ts";
import type { Linker } from "../src/util/linker.ts";
import type { Rewrite } from "../src/util/rewrite.ts";

declare global {
  namespace __hss {
    let extractions: Extraction[] | undefined;
    let enrichments: Enrichment[] | undefined;
    let linkers: Linker[] | undefined;
    let rewrites: Rewrite[] | undefined;
    let generators: IIIFGenerator[] | undefined;
  }
}

export function extract<Config = any, Temp = any>(
  config: Omit<Extraction<Config, Temp>, "handler" | "invalidate"> & {
    invalidate?: Extraction<Config, Temp>["invalidate"];
  },
  handler: Extraction<Config, Temp>["handler"]
): void;

export function enrich(
  config: Omit<Enrichment, "handler" | "invalidate"> & {
    invalidate?: Enrichment["invalidate"];
  },
  handler: Enrichment["handler"]
): void;

export function linker<Config = any>(
  config: Omit<Linker<Config>, "handler" | "invalidate"> & {
    invalidate?: Linker<Config>["invalidate"];
  },
  handler: Linker<Config>["handler"]
): void;

export function rewrite(config: Rewrite): void;

export function generator<Config = any, Temp = any>(config: IIIFGenerator<Config, Temp>): void;
