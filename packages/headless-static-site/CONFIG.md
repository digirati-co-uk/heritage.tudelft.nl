# IIIF HSS config files

This package supports two config styles:

1. A single root config file (`.iiifrc.yml`, `.iiifrc.yaml`, `iiif.config.js`, or `iiif.config.ts`)
2. A folder config (`iiif-config/`) with split files

When both exist, root files win over `iiif-config/`.

## JSON Schemas

These schemas are in `./schemas`:

- `schemas/iiif-hss.root-config.schema.json`
- `schemas/iiif-hss.store.schema.json`
- `schemas/iiif-hss.plugin-config.schema.json`

They currently use a placeholder hosted ID:

- `https://schemas.example.org/iiif-hss/...`

Replace that host/path with your final location before publishing.

## 1) Root config file (`.iiifrc.yml` / `iiif-config/config.yml`)

Use `schemas/iiif-hss.root-config.schema.json`.

Typical keys:

- `server`
- `run`
- `generators`
- `stores`
- `slugs`
- `config`
- `collections`
- `search`
- `network`
- `concurrency`
- `fileTemplates`

YAML example:

```yaml
$schema: https://schemas.example.org/iiif-hss/iiif-hss.root-config.schema.json

stores:
  local:
    type: iiif-json
    path: ./content
```

## 2) Store files (`iiif-config/stores/*.json`)

Use `schemas/iiif-hss.store.schema.json`.

Supported store types:

- `iiif-json`
- `iiif-remote`

Important: `remote-json` is not a supported type.

Remote store example:

```json
{
  "$schema": "https://schemas.example.org/iiif-hss/iiif-hss.store.schema.json",
  "type": "iiif-remote",
  "url": "https://example.org/iiif/collection.json",
  "network": {
    "concurrency": 1,
    "minDelayMs": 300,
    "maxRetries": 6
  },
  "slugTemplate": {
    "type": "Manifest",
    "domain": "example.org",
    "prefix": "/iiif/manifests/",
    "suffix": "-manifest.json"
  }
}
```

`network` can also be set globally in root config. Useful options are:

- `prefetch` (default `true`) - run warm-up automatically in `iiif-hss build`
- `concurrency` - max concurrent remote fetches
- `minDelayMs` - minimum delay between request starts
- `maxRetries`, `baseDelayMs`, `maxDelayMs`, `retryStatuses`, `respectRetryAfter`

CLI:

- `iiif-hss warm` warms the remote request cache
- `iiif-hss build --no-prefetch` skips warm-up for one run

`slugTemplate` can be inline on the store (object or array). `slugTemplates` still works for referencing entries from top-level `slugs`.

Local store example:

```json
{
  "$schema": "https://schemas.example.org/iiif-hss/iiif-hss.store.schema.json",
  "type": "iiif-json",
  "path": "./content",
  "pattern": "**/*.json"
}
```

## 3) Nested store files (`iiif-config/stores/<name>/_store.json`)

Use the same store schema: `schemas/iiif-hss.store.schema.json`.

For nested `iiif-json` stores, if `path` is omitted, it defaults to:

- `iiif-config/stores/<name>/manifests`

## 4) Plugin config fragments (`iiif-config/config/*.json`)

Use `schemas/iiif-hss.plugin-config.schema.json`.

These files are mounted into `config.<fileName>` and are intentionally plugin-specific, so the schema only enforces valid object JSON.
