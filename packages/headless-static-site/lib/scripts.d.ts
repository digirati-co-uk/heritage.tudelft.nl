import { Extraction } from "../src/util/extract.ts";
import { Enrichment } from "../src/util/enrich.ts";
import { Rewrite } from "../src/util/rewrite.ts";
import { IIIFGenerator } from "../src/util/iiif-generator.ts";

declare global {
  namespace __hss {
    let extractions: Extraction[] | undefined;
    let enrichments: Enrichment[] | undefined;
    let rewrites: Rewrite[] | undefined;
    let generators: IIIFGenerator[] | undefined;
  }
}

export function extract<Config = any, Temp = any>(
  config: Omit<Extraction<Config, Temp>, "handler" | "invalidate"> & {
    invalidate?: Extraction<Config, Temp>["invalidate"];
  },
  handler: Extraction<Config, Temp>["handler"],
): void;

export function enrich(
  config: Omit<Enrichment, "handler" | "invalidate"> & {
    invalidate?: Enrichment["invalidate"];
  },
  handler: Enrichment["handler"],
): void;

export function rewrite(config: Rewrite): void;

export function generator<Config = any, Temp = any>(
  config: IIIFGenerator<Config, Temp>,
): void;
