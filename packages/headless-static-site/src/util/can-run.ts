import { Extraction } from "./extract.ts";
import { Enrichment } from "./enrich.ts";
import { ActiveResourceJson } from "./store.ts";
import { IIIFRC } from "./get-config.ts";
import { BuildConfig } from "../commands/build.ts";

export function canRun(
  extractionOrEnrichment: Extraction | Enrichment,
  store: ActiveResourceJson,
  config: BuildConfig,
) {
  // 1. is it in the top level run list?
}
