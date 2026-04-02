# Known Issues

Append when a real issue is found. Never delete entries — mark as resolved instead.

Format:

```
## <date> — <title>
Status: open | resolved (<date>)
Package: <affected package or "repo">
Description: <what the issue is>
Resolution: <how it was fixed, or "pending">
```

---

## 2026-04-02 — Desktop renderer not yet chosen

Status: open
Package: apps/desktop
Description: ADR-001 is pending. The desktop app is a stub. `pnpm dev` in apps/desktop prints a placeholder message. No runnable app exists yet.
Resolution: pending — resolve in Step 2 after ADR-001 is decided.

## 2026-04-02 — Local database not yet chosen

Status: open
Package: repo
Description: ADR-002 is pending. No data persistence layer exists. Transaction data cannot be stored between scrape runs.
Resolution: pending — resolve in Step 2 after ADR-002 is decided.

## 2026-04-02 — Electron native modules require rebuild for packaged distribution

Status: open
Package: apps/desktop
Description: better-sqlite3 and keytar are native Node.js modules. They install and work for development and CI tests (compiled for the system Node), but for a packaged Electron app they must be rebuilt against Electron's Node via `@electron/rebuild`. This is not yet wired into the build pipeline.
Resolution: pending — address when packaging/distribution is planned.

## 2026-04-02 — Desktop renderer resolved

Status: resolved (2026-04-02)
Package: apps/desktop
Description: ADR-001 was pending. Now resolved: Electron chosen.
Resolution: ADR-001 updated to accepted. Electron app scaffold in place.

## 2026-04-02 — Local database resolved

Status: resolved (2026-04-02)
Package: repo
Description: ADR-002 was pending. Now resolved: better-sqlite3 chosen.
Resolution: ADR-002 updated to accepted. DB layer implemented in apps/desktop/src/main/db/.

## 2026-04-02 — Scraper build not wired into CI

Status: open
Package: packages/connectors-israel
Description: HapoalimConnector and MaxConnector load the scraper from external/israeli-bank-scrapers/lib/index.js at runtime. The scraper has no compiled lib/ directory (it is TypeScript source only). Running the real scrapers requires `cd external/israeli-bank-scrapers && npm run build` first. Tests use FixtureConnector and are not affected.
Resolution: pending — add a CI step to build the scraper when integration tests are added.

## 2026-04-02 — File-based importers not yet implemented

Status: open
Package: packages/core-model (normalization contract defined)
Description: PDF, XLSX, and CSV importers must produce RawImportRecord[] with sourceType='pdf'/'xlsx'/'csv', the appropriate extractionMethod, and confidenceScore for OCR/agent paths. The normalization pipeline is ready to receive them, but no file import adapters exist yet.
Resolution: pending — implement in a future step.

## 2026-04-02 — raw_references table deferred

Status: open
Package: apps/desktop
Description: RawImportRecord.rawReference is stored on the canonical Transaction for traceability, but a dedicated raw_references table (for storing full raw payloads) was deferred until file import is implemented.
Resolution: pending.
