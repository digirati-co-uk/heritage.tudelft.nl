import {
  type AstroIiifClientOptions,
  type AstroIiifClientResolvedResource,
  type AstroIiifStaticPathOptions,
  createIiifAstroClient,
} from "../astro/client.ts";
import type { AstroIiifRoutes, IIIFResourceType, IIIFSitemapEntry, StaticPathStripPrefix } from "../astro/shared.ts";

export type ViteIiifRoutes = AstroIiifRoutes;
export type ViteIiifResourceType = IIIFResourceType;
export type ViteIiifSitemapEntry = IIIFSitemapEntry;
export type ViteIiifStaticPathStripPrefix = StaticPathStripPrefix;

export interface ViteIiifClientOptions extends AstroIiifClientOptions {
  routes?: ViteIiifRoutes;
}

export type ViteIiifClientResolvedResource = AstroIiifClientResolvedResource;
export type ViteIiifStaticPathOptions = AstroIiifStaticPathOptions;

/**
 * Vite/browser helper API for reading iiif-hss JSON endpoints.
 * Re-uses the Astro client helpers so apps can share the same loading patterns.
 */
export function createIiifViteClient(options: ViteIiifClientOptions = {}) {
  return createIiifAstroClient(options);
}

export default createIiifViteClient;
