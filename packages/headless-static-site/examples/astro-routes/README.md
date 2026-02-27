# Astro example (custom routes)

Uses `iiif-hss/astro` with a remote collection and custom app route prefixes:

- manifests route prefix: `/objects`
- collections route prefix: `/browser`

This is configured in `src/lib/iiif-routes.ts` and passed to both APIs:

- `createIiifAstroServer({ routes: iiifRoutes })`
- `createIiifAstroClient({ routes: iiifRoutes })`

It demonstrates route-safe static path generation using:

- `iiif.getManifestStaticPathsFromCollection(...)`
- `iiif.getCollectionStaticPathsFromCollection(...)`

## Run

```bash
pnpm install
pnpm dev
```

## Notes

The underlying IIIF slugs can still be prefixed as `manifests/...` and `collections/...`.
The Astro APIs deduplicate these against your configured route prefixes so pages resolve correctly at `/objects/*` and `/browser/*`.
