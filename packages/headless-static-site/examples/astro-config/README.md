# Astro example (`iiif-config` folder mode)

Uses `iiif-hss/astro` with zero inline options:

- `astro.config.mjs` calls `iiif()`
- runtime config is loaded from `./iiif-config`
- store definitions live in `iiif-config/stores/*.json`

This example includes a remote store (`peace-petition`) with an inline `slugTemplate` declared directly in its store file.

## Run

```bash
pnpm install
pnpm dev
```
