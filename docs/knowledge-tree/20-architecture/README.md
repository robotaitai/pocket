# 20-architecture — How is the system structured?

## Package Dependency Graph

```
desktop
├── core-model          (domain types — no dependencies)
├── connectors-israel   (scraping — depends on core-model + external submodule)
├── rules-engine        (categorization — depends on core-model)
├── insights            (aggregation — depends on core-model, rules-engine)
└── ui                  (components — no domain dependencies)

shared-tag-client       (optional sync — standalone)
test-fixtures           (test data — depends on core-model, test-only)

external/israeli-bank-scrapers  (git submodule, opaque external dependency)
```

## Isolation Principle

`@pocket/connectors-israel` is the **only** package allowed to import from `external/israeli-bank-scrapers`. All other packages consume normalized `@pocket/core-model` types only. This boundary prevents scraper implementation details from leaking into product code.

## Data Flow

```
external scraper
  → connectors-israel (normalize to core-model types)
    → rules-engine (apply user rules)
      → insights (aggregate)
        → desktop (render via ui components)
```

## Pending Decisions

- [decisions/ADR-001-desktop-renderer.md](./decisions/ADR-001-desktop-renderer.md) — Electron vs Tauri
- [decisions/ADR-002-local-database.md](./decisions/ADR-002-local-database.md) — SQLite vs other

## Connector Runtime Contract

`@pocket/connectors-israel` wraps `external/israeli-bank-scrapers` behind the `Connector` interface. Key points:
- The real scraper is loaded at runtime via a non-literal import path (`scraper-loader.ts`) to avoid TypeScript resolving its unbuilt module graph
- The scraper must be built (`npm run build` in `external/`) before running real connectors
- Tests always use `FixtureConnector` — no puppeteer, no network, no credentials
- Transaction IDs are SHA-256 deterministic hashes for idempotent imports
- Auth errors are never retried; network/unknown errors retry up to 3× with exponential backoff

## Canonical Model and Normalization Boundary (Step 4)

All ingestion paths — scrapers, file imports, future API connectors — must pass through
the normalization pipeline in `@pocket/core-model` before data reaches the DB or UI.

```
Source (scraper / PDF / XLSX / CSV / API)
  → RawImportRecord[]               (connector/importer output)
    → normalizeImport(raws, batch)  (@pocket/core-model pipeline)
      → Transaction[]               (canonical, with full Provenance)
        → DB / UI / insights        (consumers of canonical model)
```

Key invariants:
- Every `Transaction` carries required `Provenance` fields — they are never dropped
- `transactionId` is deterministic and source-agnostic — cross-source dedup works by id
- Ambiguous extracted fields carry `warnings[]` and `confidenceScore` — not silently guessed
- `connectors-israel` never produces `Transaction` directly — only `RawImportRecord[]`
- DB schema is versioned; migrations are forward-only and idempotent (schema v2 as of step 4)
