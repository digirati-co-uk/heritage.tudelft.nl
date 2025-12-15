import type { InternationalString } from "@iiif/presentation-3";
import type { Enrichment, EnrichmentResult } from "./enrich";
import type { Extraction, ExtractionReturn } from "./extract";
import type { ActiveResourceJson } from "./store";

export class Tracer {
  extractions: Record<
    string,
    {
      startTime: number;
      endTime: number;
      totalTime: number;
      count: number;
    }
  > = {};

  enrichments: Record<
    string,
    {
      startTime: number;
      endTime: number;
      totalTime: number;
      count: number;
    }
  > = {};

  resources: Record<
    string,
    {
      label: InternationalString;
      thumbnail: string | null;
      extractionStart: number;
      extractionEnd: number;
      extractions: Record<
        string,
        | {
            start: number;
            end: number;
            result: ExtractionReturn;
            cacheHit: false;
          }
        | { cacheHit: true }
      >;
      enrichmentStart: number;
      enrichmentEnd: number;
      enrichments: Record<
        string,
        | {
            start: number;
            end: number;
            result: EnrichmentResult<any>;
            cacheHit: false;
          }
        | { cacheHit: true }
      >;
      files: string[];
      withinCollections: string[];
    }
  > = {};

  topics: Record<
    string,
    {
      meta: any;
      yaml: { path: string; data: any } | null;
    }
  > = {};

  private ensureResource(slug: string) {
    if (!this.resources[slug]) {
      this.resources[slug] = {
        label: {},
        thumbnail: null,
        extractionStart: 0,
        extractionEnd: 0,
        enrichmentStart: 0,
        enrichmentEnd: 0,
        extractions: {},
        enrichments: {},
        files: [],
        withinCollections: [],
      };
    }
  }

  startExtractions(resource: ActiveResourceJson) {
    const slug = resource.slug;
    this.ensureResource(slug);

    this.resources[slug].extractionStart = performance.now();
  }

  extraction(
    resource: ActiveResourceJson,
    extraction: Extraction,
    result: ExtractionReturn,
    startTime: number,
    endTime: number
  ) {
    const slug = resource.slug;
    this.ensureResource(slug);
    // Assuming extraction has an id or key property
    const extractionKey = (extraction as any).id || (extraction as any).key || JSON.stringify(extraction);
    this.resources[slug].extractions[extractionKey] = {
      start: startTime,
      end: endTime,
      result,
      cacheHit: false,
    };

    if (result.meta?.label) {
      this.resources[slug].label = result.meta.label;
    }
    if (result.meta?.thumbnail) {
      this.resources[slug].thumbnail = result.meta.thumbnail?.id;
    }

    // Update global extractions tracking
    const duration = endTime - startTime;
    if (!this.extractions[extractionKey]) {
      this.extractions[extractionKey] = {
        totalTime: 0,
        count: 0,
        startTime: startTime,
        endTime: endTime,
      };
    }
    this.extractions[extractionKey].startTime = Math.min(this.extractions[extractionKey].startTime, startTime);
    this.extractions[extractionKey].endTime = Math.max(this.extractions[extractionKey].endTime, endTime);
    this.extractions[extractionKey].totalTime += duration;
    this.extractions[extractionKey].count += 1;
  }

  endExtractions(resource: ActiveResourceJson) {
    const slug = resource.slug;
    this.ensureResource(slug);
    this.resources[slug].extractionEnd = performance.now();
  }

  file(resource: ActiveResourceJson, file: string) {
    const slug = resource.slug;
    this.ensureResource(slug);
    if (!this.resources[slug].files.includes(file)) {
      this.resources[slug].files.push(file);
    }
  }

  directory(resource: ActiveResourceJson, directory: string) {
    const slug = resource.slug;
    this.ensureResource(slug);
    if (!this.resources[slug].files.includes(directory)) {
      this.resources[slug].files.push(directory);
    }
  }

  collectionReference(resource: ActiveResourceJson, collection: string) {
    const slug = resource.slug;
    this.ensureResource(slug);
    if (!this.resources[slug].withinCollections.includes(collection)) {
      this.resources[slug].withinCollections.push(collection);
    }
  }

  extractionCacheHit(resource: ActiveResourceJson, extraction: Extraction) {
    const slug = resource.slug;
    this.ensureResource(slug);
    const extractionKey = (extraction as any).id || (extraction as any).key || JSON.stringify(extraction);
    this.resources[slug].extractions[extractionKey] = {
      cacheHit: true,
    };

    // Update global extractions tracking for cache hits (no time added, just count)
    if (!this.extractions[extractionKey]) {
      this.extractions[extractionKey] = {
        totalTime: 0,
        count: 0,
        startTime: performance.now(),
        endTime: performance.now(),
      };
    }
    this.extractions[extractionKey].count += 1;
  }

  startEnrich(resource: ActiveResourceJson) {
    const slug = resource.slug;
    this.ensureResource(slug);
    this.resources[slug].enrichmentStart = performance.now();
    // Store start time for potential use in tracking enrichment duration
  }

  enrich(
    resource: ActiveResourceJson,
    enrichment: Enrichment,
    result: EnrichmentResult<any>,
    startTime: number,
    endTime: number
  ) {
    const slug = resource.slug;
    this.ensureResource(slug);
    const enrichmentKey = (enrichment as any).id || (enrichment as any).key || JSON.stringify(enrichment);
    this.resources[slug].enrichments[enrichmentKey] = {
      start: startTime,
      end: endTime,
      result,
      cacheHit: false,
    };

    // Update global enrichments tracking
    const duration = endTime - startTime;
    if (!this.enrichments[enrichmentKey]) {
      this.enrichments[enrichmentKey] = {
        totalTime: 0,
        count: 0,
        startTime: startTime,
        endTime: endTime,
      };
    }
    this.enrichments[enrichmentKey].startTime = Math.min(this.enrichments[enrichmentKey].startTime, startTime);
    this.enrichments[enrichmentKey].endTime = Math.max(this.enrichments[enrichmentKey].endTime, endTime);
    this.enrichments[enrichmentKey].totalTime += duration;
    this.enrichments[enrichmentKey].count += 1;
  }

  endEnrich(resource: ActiveResourceJson) {
    const slug = resource.slug;
    this.ensureResource(slug);
    this.resources[slug].enrichmentEnd = performance.now();
  }

  enrichCacheHit(resource: ActiveResourceJson, enrichment: Enrichment) {
    const slug = resource.slug;
    this.ensureResource(slug);
    const enrichmentKey = (enrichment as any).id || (enrichment as any).key || JSON.stringify(enrichment);
    this.resources[slug].enrichments[enrichmentKey] = {
      cacheHit: true,
    };

    // Update global enrichments tracking for cache hits (no time added, just count)
    if (!this.enrichments[enrichmentKey]) {
      this.enrichments[enrichmentKey] = {
        totalTime: 0,
        count: 0,
        startTime: performance.now(),
        endTime: performance.now(),
      };
    }
    this.enrichments[enrichmentKey].count += 1;
  }

  topic(
    meta: { id: string; label: string; slug: string } & Record<string, any>,
    yaml: { path: string; data: any } | null
  ) {
    this.topics[meta.slug] = {
      meta,
      yaml,
    };
  }

  toJSON() {
    return {
      enrichments: this.enrichments,
      extractions: this.extractions,
      resources: this.resources,
      topics: this.topics,
    };
  }
}
