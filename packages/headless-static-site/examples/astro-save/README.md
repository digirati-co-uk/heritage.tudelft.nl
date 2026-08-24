# Astro example (save: true local manifests)

Uses `iiif-hss/astro` with:

- `collection: "https://theseusviewer.org/cookbook-collection.json"`
- `save: true`

The pages intentionally keep Astro-specific logic minimal and use the new APIs:

- `iiif-hss/astro/server` for build-time/static generation
- `iiif-hss/astro/client` for hydrated client components

## Run

```bash
pnpm install
pnpm dev
```
