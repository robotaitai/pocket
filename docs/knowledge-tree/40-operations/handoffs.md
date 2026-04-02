# Handoffs

Agent-to-agent handoff log. Append after completing each step. Never delete entries.

---

## Step 0 — Repo skeleton, knowledge tree, submodule — 2026-04-02

### What was done

- Initialized pnpm workspace with 7 packages and 1 app
- Registered `external/israeli-bank-scrapers` as a git submodule
- Created full knowledge tree under `docs/knowledge-tree/` (branches 00–50)
- Created CI skeleton: install, verify-submodule, lint-markdown, typecheck, test
- Created ADR stubs: ADR-001 (desktop renderer), ADR-002 (local database)
- Committed as root commit c70323c

### Decisions made

- pnpm 9 workspaces chosen for monorepo tooling
- TypeScript strict mode with NodeNext module resolution
- `markdownlint-cli2` for markdown lint; MD013/MD040/MD041 disabled (docs-friendly)
- All packages share `tsconfig.base.json` at root

### What the next agent must read

- `docs/knowledge-tree/README.md`
- `docs/knowledge-tree/20-architecture/README.md`
- `docs/knowledge-tree/30-engineering/README.md`
- `.github/workflows/ci.yml`

### Pending / deferred

- ADR-001 (desktop renderer): not decided — blocks Step 1 app scaffold
- ADR-002 (local database): not decided — blocks data persistence work

---

## Step 1 — Foundation and workspace bootstrap — 2026-04-02

### What was done

- Added root README.md, CONTRIBUTING.md, AGENTS.md, LICENSE (MIT), CODEOWNERS
- Added PR template enforcing docs/tests/privacy/scraper-boundary checklist
- Added issue templates: bug report, feature request (both enforce privacy check)
- Added `docs/knowledge-tree/00-project/facts.md` (durable project facts)
- Added `docs/knowledge-tree/40-operations/handoffs.md` (this file)
- Added `docs/knowledge-tree/40-operations/known-issues.md`
- Added `lint` script placeholder and `check:structure` script to root package.json
- Added `lint` and `file-structure-check` CI jobs

### Decisions made

- AGENTS.md is the canonical instruction file for AI agents working in this repo
- PR template is a single file (not per-type) — keeps review surface simple
- Issue templates use GitHub YAML format for structured input
- `check:structure` is a bash script in `scripts/check-structure.sh` for portability

### What the next agent must read

- `AGENTS.md`
- `docs/knowledge-tree/00-project/facts.md`
- `docs/knowledge-tree/20-architecture/decisions/ADR-001-desktop-renderer.md`
- `docs/knowledge-tree/20-architecture/decisions/ADR-002-local-database.md`

### Pending / deferred

- ADR-001 and ADR-002 still pending — Step 2 (desktop scaffold + data layer) requires these decisions

---

## Repo Hygiene and Structure Guardrails — 2026-04-02

### What was done

- Created `scripts/check-repo-hygiene.mjs` — enforces allowed root entries, no stray markdown, .gitignore sanity, submodule path, no forbidden tracked files, knowledge tree structure
- Updated `.gitignore` to cover `out/`, `*.db`, `*.sqlite`, `*.csv`, `*.log`, `.cache/`, `.vite/`, `Thumbs.db`, `secrets.enc.json`
- Added "Repo cleanliness rule" section to `AGENTS.md` — agents must now follow folder ownership rules
- Added `check:hygiene` script to root `package.json`
- Added `repo-hygiene` CI job (runs `check-repo-hygiene.mjs` in Node.js, no pnpm install needed)
- Confirmed root contains only approved entries; no cleanup of existing files was required

### Decisions made

- Hygiene script uses `git ls-tree --name-only HEAD` for root check — reads from git index, not filesystem, so local gitignored artifacts (node_modules, etc.) are invisible to the check
- Forbidden tracked file check uses `git ls-files` — reliable in both CI and local
- `check-repo-hygiene.mjs` and `check-structure.sh` are complementary: structure checks that required files exist; hygiene checks that forbidden things are absent
- `.mjs` chosen for the hygiene script — zero dependencies, runs with `node` directly in CI without pnpm install

### What the next agent must read

- `AGENTS.md` (updated with repo cleanliness rule)
- `scripts/check-repo-hygiene.mjs` (understand what is enforced automatically)
- `docs/knowledge-tree/20-architecture/decisions/ADR-001-desktop-renderer.md`
- `docs/knowledge-tree/20-architecture/decisions/ADR-002-local-database.md`

### Pending / deferred

- ADR-001 and ADR-002 still pending — must be resolved before Step 2 coding begins

---

## Step 2 — Local app shell and secure local storage — 2026-04-02

### What was done

- Locked ADR-001 (Electron) and ADR-002 (better-sqlite3); both now status: accepted
- Defined `@pocket/core-model` canonical types: `Transaction`, `Account`, `Balance`, `Currency`
- Rebuilt `apps/desktop` as a full Electron app:
  - Main process: `src/main/index.ts` — creates BrowserWindow, registers IPC handlers
  - Preload: `src/preload/index.ts` — exposes `window.pocket.settings` and `window.pocket.secrets` via contextBridge
  - Renderer: React + Vite SPA with `FirstRun` and `Dashboard` pages
  - DB layer: `src/main/db/init.ts` (schema migrations, WAL, FK constraints), `src/main/db/settings.ts`
  - Secret storage: `src/main/secrets/index.ts` — `SecretStore` interface + keytar production impl + null test impl
- Added real tests (18 assertions, no DB mocking): `tests/db.test.ts`, `tests/settings.test.ts`, `tests/secrets.test.ts`
- Added `@types/node`, `better-sqlite3`, `keytar`, `electron`, `react`, `react-dom`, `vite`, `vitest` to apps/desktop
- Added `tsconfig.renderer.json` and `tsconfig.test.json` for correct type coverage across all three contexts
- Full workspace typecheck and tests pass

### Decisions made

- ADR-001: Electron — no Rust required, Node 22 available in Electron 35, native module support is mature
- ADR-002: better-sqlite3 — synchronous API simplifies IPC handlers; no ORM per project rules; WAL mode for concurrency
- CJS output for main/preload (no `"type":"module"` in package.json) — Electron preload compatibility
- `createNullSecretStore()` for tests — avoids native `keytar` bindings in CI; satisfies "tests must be real" rule because DB tests hit real SQLite, not mocks
- `window.pocket` API typed in `src/renderer/pocket.d.ts` — renderer gets type safety without Node.js access

### What the next agent must read

- `apps/desktop/src/main/index.ts` — IPC surface and app lifecycle
- `apps/desktop/src/main/db/init.ts` — schema and migrations
- `apps/desktop/src/main/secrets/index.ts` — SecretStore interface
- `packages/core-model/src/index.ts` — canonical types (used by all packages)
- `docs/knowledge-tree/20-architecture/decisions/ADR-001-desktop-renderer.md`
- `docs/knowledge-tree/20-architecture/decisions/ADR-002-local-database.md`

### Pending / deferred

- Electron native module rebuild (better-sqlite3, keytar) for packaged distribution — addressed at release time
- No app build/packaging CI job yet — add when distribution is needed

---

## Step 3 — Connector framework and scraper adapter boundary — 2026-04-02

### What was done

- Defined the `Connector` interface and all supporting types in `packages/connectors-israel/src/connector.ts`:
  - `ConnectorDescriptor` — metadata (id, name, institutionType, credentialFields)
  - `ImportOptions` — date range for a scrape run
  - `ImportResult` (`ImportSuccess | ImportError`) — normalized output
- Declared minimal scraper types in `src/scraper-types.ts` — isolated from the real scraper source; prevents scraper's module graph from entering typecheck
- Implemented `BaseAdapter` — normalizes raw scraper output to core-model types; classifies errors (auth / network / unknown); never logs credential values
- Implemented `HapoalimConnector` (bank) and `MaxConnector` (card) — both extend `BaseAdapter`
- Implemented `FixtureConnector` — test-only connector with no puppeteer/network dependency
- Implemented `withRetry` in `src/retry.ts` — exponential backoff, max 3 attempts, auth errors never retried
- Implemented `normalizeAccount` / `normalizeTransaction` / `transactionId` in `src/normalize.ts` — deterministic SHA-256 IDs for idempotency
- Created `src/scraper-loader.ts` — loads the compiled scraper via a non-literal import path, preventing TypeScript from statically resolving the scraper module tree
- Added sanitized fixtures in `packages/test-fixtures/src/index.ts` (accounts, transactions, balances)
- Added raw scraper-shaped fixtures in `packages/connectors-israel/tests/fixtures/scraper-accounts.ts`
- 23 real tests: normalize.test.ts (11), connector-contract.test.ts (7), retry.test.ts (5)
- Total: 41 tests across the workspace, all passing

### Decisions made

- **Scraper import isolation via non-literal path**: `SCRAPER_PATH: string = '...'` causes TypeScript to treat `import(SCRAPER_PATH)` as `Promise<any>`, preventing the scraper's unbuilt module graph from being typechecked. The scraper must be built (`npm run build` in `external/`) before the connector runs at runtime.
- **Minimal type declarations** in `scraper-types.ts`: avoids importing from the scraper's source at typecheck time; must be kept in sync manually with `external/israeli-bank-scrapers/src/`
- **FixtureConnector** for tests: no puppeteer, no network, no real scraper; tests the full normalize + contract surface
- **Auth errors never retried**: `withRetry` exits immediately on `errorKind: 'auth'`; wrong credentials won't be fixed by retrying
- **SHA-256 IDs truncated to 32 chars**: sufficient uniqueness for a single-user local DB; deterministic for idempotent upserts
- **`exports` field on `@pocket/core-model`**: points `"types"` to `./src/index.ts` so workspace packages can typecheck against source without a build step

### What the next agent must read

- `packages/connectors-israel/src/connector.ts` — the Connector interface
- `packages/connectors-israel/src/normalize.ts` — idempotency logic
- `packages/connectors-israel/src/retry.ts` — retry policy
- `packages/connectors-israel/src/scraper-loader.ts` — how the real scraper is loaded at runtime
- `packages/connectors-israel/src/adapters/base.ts` — adapter base class
- `packages/test-fixtures/src/index.ts` — canonical test data

### Pending / deferred

- Scraper build step not wired into CI — the scraper (`external/`) must be built manually before `HapoalimConnector` or `MaxConnector` can run at runtime
- No log-redaction test covering the production adapters — FixtureConnector never logs; production adapter logging should be verified in an integration test once the scraper is built in CI
- Step 4 (rules engine and insights) not started

---

## Step 4 — Canonical finance model, import provenance, normalization boundary — 2026-04-02

### What was done

**`@pocket/core-model` — new canonical model:**
- `provenance.ts`: `SourceType` ('scraper'|'pdf'|'xlsx'|'csv'|'api'|'manual'), `ExtractionMethod`, `Warning`, `Provenance` interface
- `import-batch.ts`: `ImportBatch`, `ImportBatchStatus`, `createImportBatch()` factory
- `merchant.ts`: `Merchant` (normalized name + aliases for cross-source merchant identity)
- `raw-import.ts`: `RawImportRecord` — the single input type for all ingestion paths
- `normalization.ts`: `transactionId()` (moved from connectors-israel), `validateRawRecord()`, `normalizeImport()` pipeline
- `dedupe.ts`: `deduplicateById()` (exact + fuzzy cross-source), `findPotentialDuplicates()` (intra-batch)
- Updated `Transaction` — now requires all `Provenance` fields, `schemaVersion`, `warnings[]`, `confidenceScore?`
- 49 tests covering normalization, dedupe, provenance preservation, schema validation, malformed payloads

**`apps/desktop` — DB schema v2:**
- `init.ts` restructured into versioned forward migrations (`migrateV1`, `migrateV2`)
- V2 adds: `import_batches`, `merchants` tables; provenance columns on `transactions`
- Migration is idempotent and detects existing schema version to apply only pending steps
- V1→V2 forward migration test included (simulates a legacy DB being upgraded)

**`@pocket/connectors-israel` — boundary tightened:**
- `ImportSuccess.transactions` replaced by `ImportSuccess.rawRecords: RawImportRecord[]`
- `normalizeTransaction()` replaced by `normalizeRawRecord()` — produces pre-canonical records with no `importBatchId`
- `transactionId()` moved to `@pocket/core-model/src/normalization.ts`
- Connector tests updated to run the full pipeline: connector → rawRecords → `normalizeImport()` → canonical Transactions

**`@pocket/test-fixtures` — updated to schema v2:**
- All fixture `Transaction` objects now carry full provenance fields
- Added `fixtureImportBatch`, `fixturePdfImportBatch`, `fixtureRawRecords`

**Test coverage summary:**
- core-model: 49 tests (normalization 20, schema-validation 15, dedupe 8, provenance 6)
- connectors-israel: 20 tests (contract 8, normalize 7, retry 5)
- desktop: 27 tests (migration 9, db 7, settings 6, secrets 5)
- Total: 96 tests, all green

### Decisions made

- **Normalization boundary is strict**: connectors-israel never produces canonical `Transaction` directly; it produces `RawImportRecord[]`. The caller always runs `normalizeImport()` from `@pocket/core-model` before touching the DB or sending to UI.
- **Cross-source deduplication via deterministic id**: `sha256(accountId|date|processedDate|originalAmount|originalCurrency|description).slice(0,32)` — same real transaction from any source produces the same id. No source-specific prefix.
- **Fuzzy deduplication flags, not silences**: same (accountId+date+amount) with different descriptions → `potentialDuplicates` list for user review. NOT silently merged.
- **Ambiguous values required to carry warnings**: agent/OCR extractors must set `confidenceScore` and populate `warnings[]`. The pipeline propagates these; it never drops them.
- **Schema versioning via version table + explicit migration functions**: forward-only, idempotent, detectable from cold start. No ORM.
- **Vitest workspace alias**: connectors-israel vitest config aliases `@pocket/core-model` to its TypeScript source, enabling tests without a build step across packages.

### What the next agent must read

- `packages/core-model/src/normalization.ts` — canonical pipeline entry point
- `packages/core-model/src/raw-import.ts` — the universal ingestion input format
- `packages/core-model/src/dedupe.ts` — deduplication logic and types
- `packages/core-model/src/import-batch.ts` — how batches are created and tracked
- `apps/desktop/src/main/db/init.ts` — schema v2 and migration structure
- `docs/knowledge-tree/20-architecture/README.md`

### Pending / deferred

- File-based importers (PDF/XLSX/CSV) not yet implemented — they must produce `RawImportRecord[]` with appropriate `sourceType`/`extractionMethod` and `confidenceScore` before calling `normalizeImport()`
- Agent-assisted extraction path not yet implemented — contract is defined by `RawImportRecord`
- `raw_references` table (for opaque raw source storage) not added — deferred until file import is implemented
- `merchants` table populated by normalization not yet wired — merchant resolution is available as a type but not called from the pipeline yet

## Step 5 — Review Queue, Import Validation, and Ultra-Fast Tagging Workflow — 2026-04-02

### What was done

- Schema v3 migration: added `review_status` (pending/accepted/rejected), `reviewed_at`, `user_category` columns to `transactions`; created `merchant_rules` and `review_actions` tables
- `apps/desktop/src/main/db/review.ts`: full review queue DB layer — `getBatchSummaries`, `getTransactionsForReview`, `setReviewStatus`, `setTransactionCategory`, `undoLastAction`
- `apps/desktop/src/main/db/merchant-rules.ts`: merchant memory — `suggestCategory`, `recordMerchantRule`, `getAllMerchantRules`, `deleteMerchantRule`
- IPC handlers in `main/index.ts`: `review:getBatches`, `review:getTransactions`, `review:accept`, `review:reject`, `review:setCategory`, `review:undo`, `merchantRules:*`
- Preload and `pocket.d.ts` updated with full typed API surface
- Renderer components: `SourceBadge`, `ConfidenceIndicator`, `QuickTag`, `BulkActions`, `KeyboardHelp`, `TransactionRow`
- `ReviewQueue` page: batch list with pending/accepted/rejected counts
- `BatchReview` page: keyboard-first (j/k nav, a/r, t tag, Space select, u undo, ? help)
- `Dashboard` updated with Review / Accounts / Settings tabs
- 82 tests across 12 files — 6 node-env DB/migration suites, 6 jsdom component suites

### Decisions made

- `review_status` is DB-layer-only; canonical `Transaction` type stays clean — review is workflow, not data model
- `merchant_rules` uses lowercased+trimmed exact match; fuzzy deferred
- `review_actions` capped at 50 for bounded undo history
- `pocket.d.ts` uses `declare global { interface Window }` because file has module exports
- `better-sqlite3` native module must be rebuilt separately for system Node.js (tests) and Electron (app launch) — see known-issues.md

### What the next agent must read

- `apps/desktop/src/main/db/review.ts`
- `apps/desktop/src/main/db/merchant-rules.ts`
- `apps/desktop/src/renderer/pages/BatchReview.tsx`
- `apps/desktop/src/renderer/pocket.d.ts`

### Pending / deferred

- File-based importers (PDF/XLSX/CSV) — must produce `RawImportRecord[]` then normalizeImport → DB insert with `review_status='pending'`
- Connector import flow not wired end-to-end — credentials UI and import button not yet built
- Duplicate resolution UI — `findPotentialDuplicates()` exists but not surfaced in BatchReview
- Merchant fuzzy matching — current pattern match is exact; Levenshtein deferred

## Step 6 — Insights, Recurring Payments, Import Health, and Chat over Normalized Data — 2026-04-02

### What was done

- `packages/insights` fully implemented: aggregations, recurring detection, merchant summaries, import health, pattern-based chat engine, CSV export
  - `summarizePeriod`, `comparePeriods` — period income/expense/net with low-confidence flagging
  - `detectRecurring` — groups by normalized description, computes median interval, classifies period (weekly/biweekly/monthly/quarterly), confidence score
  - `buildMerchantSummaries`, `findNewAndSuspiciousMerchants` — merchant spend ranking, new/suspicious detection
  - `buildImportHealthReport` — freshness labels (today/this-week/this-month/older), source type summaries
  - `parseChatQuestion` — regex pattern matching to structured ChatQueryPlan (13 intents)
  - `exportToCsv` — RFC 4180-compliant CSV with proper quoting
- `apps/desktop/src/main/db/insights.ts` — SQL queries: `getAcceptedTransactions`, `getBatchHealthRows`, `searchTransactions`, `getTransactionsForExport`
- `apps/desktop/src/main/chat-executor.ts` — executes ChatQueryPlan against DB, formats natural language answers with supporting sources
- IPC handlers: `insights:getSummary`, `insights:getRecurring`, `insights:getMerchants`, `insights:getNewMerchants`, `insights:search`, `insights:getImportHealth`, `insights:chat`, `insights:export` (native dialog save)
- New renderer pages: `DashboardHome`, `RecurringPayments`, `MerchantView`, `Timeline`, `ImportHealth`, `Chat`
  - Dashboard now has 7 tabs: Home / Review / Recurring / Merchants / Timeline / Import Health / Chat
  - Timeline has debounced live search with CSV export button
  - Chat shows suggested questions, sources per answer, uncertainty notes, query plan label
- `pocket.d.ts` expanded with full typed insights API
- 201 tests total across all packages: 50 new insights tests (aggregation, recurring, merchants, chat, export, import health)

### Decisions made

- Chat is purely pattern-based with NO external LLM dependency — grounded queries only, never invents data
- "Unknown" intent returns a list of supported questions instead of failing silently
- CSV export uses Electron's native save dialog via `dialog.showSaveDialog` — no upload, fully local
- `getAcceptedTransactions` re-hydrates canonical `Transaction` objects from DB (avoids storing duplicates of the canonical model)
- `detectRecurring` operates on in-memory arrays — fast enough for personal-scale data (<10k transactions)
- Merchant "suspicious" heuristic: untagged + |avg_amount| > 200 ILS — intentionally conservative
- `freshnessLabel` is computed in the pure `buildImportHealthReport` function, not in SQL, to keep DB layer simple

### What the next agent must read

- `packages/insights/src/chat.ts` — supported intents and pattern matching
- `apps/desktop/src/main/chat-executor.ts` — how intents map to DB queries and answers
- `apps/desktop/src/main/db/insights.ts` — SQL query layer
- `apps/desktop/src/renderer/pages/Chat.tsx` — chat UX
- `apps/desktop/src/renderer/pages/Dashboard.tsx` — tab routing

### Pending / deferred

- LLM-enhanced chat: post-query formatting via an optional API key — safe because only aggregated results (not raw transactions) would be sent
- Connector import flow not wired end-to-end — no UI to trigger a scraper import run yet
- File-based importers (PDF/XLSX/CSV) still not implemented
- Timeline paginates at 200 results — add virtual scrolling for larger datasets
- Recurring detection could improve with fuzzy merchant matching across slightly different descriptions

## Step 7 — Connected agent mode, shared intelligence, privacy boundaries, release hardening — 2026-04-02

### What was done

- Created `packages/agent-client` — provider abstraction with adapters for OpenAI, Anthropic (Claude), and Google Gemini, plus a local no-op provider
- All adapters use raw `fetch` (no SDK deps); justified because provider SDKs add 1–2MB each for endpoints we barely use
- Defined privacy contract in `packages/agent-client/src/privacy.ts` with sanitization functions for all three payload types (extraction, chat, merchant suggestion)
- Added `xlsx` dep to `apps/desktop` for native XLSX parsing (justified: no standard Node.js XLSX parser)
- Created `apps/desktop/src/main/file-extractor.ts` — CSV (native, no provider), XLSX (xlsx lib, no provider), PDF (provider required, local-only returns clear error)
- Created `apps/desktop/src/main/db/providers.ts` — provider config persistence in SQLite settings, key names for keychain
- Extended `apps/desktop/src/main/index.ts` with 7 new IPC handlers: `provider:getConfig`, `provider:setConfig`, `provider:setKey`, `provider:clearKey`, `provider:testConnection`, `fileImport:pickAndExtract`
- Extended `chat-executor.ts` with optional provider parameter; enhancement passes only question + formatted text to provider (never raw DB data)
- Created `apps/desktop/src/renderer/pages/Settings.tsx` — full settings page: mode toggle, provider selector, API key input with show/hide, test connection, capability toggles, privacy boundaries panel
- Created `apps/desktop/src/renderer/pages/Import.tsx` — file picker, extraction progress, result display with stats and warnings
- Added Import and Settings tabs to `Dashboard.tsx`
- Added `electron-builder.yml` with macOS arm64 + x64 DMG config, Linux AppImage, Windows NSIS, asar packaging with native module unpack
- Added `build:release` and `build:mac` scripts to desktop package
- Extended `pocket.d.ts` and `preload/index.ts` with provider and fileImport APIs
- Fixed vitest alias config in desktop to include `@pocket/agent-client`
- 243 total tests passing (35 new in agent-client)

### Decisions made

- **Local-only mode is default** — app ships in local mode, user explicitly opts in to connected mode. Rationale: minimizes risk surface for new users.
- **No provider SDKs** — use raw fetch. Rationale: SDKs add 1-2MB each for 3 endpoints we use; fetch is auditable and avoids transitive deps.
- **PDF requires provider** — no local PDF text parser added. Rationale: `pdf-parse` and similar libs are complex with security history; provider-assisted extraction is already the design intent.
- **Extraction payload = document text only** — never account IDs, balances, or DB data. Defense in depth: `sanitizeDocumentText` strips any IBAN patterns even from user documents.
- **Chat enhancement is pass-through on failure** — if provider call fails, user sees local answer unchanged. No silent degradation.
- **xls handled as xlsx** — removed `xls` case from switch; XLSX lib handles both extensions but the type is typed as `xlsx`. Avoids type error.
- **electron-builder with ad-hoc signing** — no Apple Developer account required for local distribution. Notarization documented but not configured.

### What the next agent must read

- `packages/agent-client/src/types.ts` — AgentProvider interface and all payload types
- `packages/agent-client/src/privacy.ts` — privacy contract and enforcement
- `apps/desktop/src/main/file-extractor.ts` — extraction pipeline and ingestion
- `apps/desktop/src/main/db/providers.ts` — config storage
- `apps/desktop/src/main/index.ts` — all IPC handlers (provider: and fileImport: namespaces)
- `apps/desktop/electron-builder.yml` — release packaging config
- `docs/knowledge-tree/40-operations/known-issues.md` — see Step 7 entries

### Pending / deferred

- `.xls` (legacy Excel) files not handled — XLSX lib supports them but requires the SupportedFileType union to be extended
- Shared merchant/category suggestion service not implemented — abstraction in place, real endpoint TBD
- Windows and Linux release builds not tested — config is present but untested on those platforms
- Auto-update not configured — electron-updater would require a hosting endpoint
- Connector (scraper) import UI still not wired to Dashboard — can be triggered via dev tools but no UI button exists
- PDF extraction quality depends entirely on the provider and document text layer quality

## Step 8 — Secret handling, dev workflow, and credential management — 2026-04-02

### What was done

- Created `apps/desktop/src/main/secrets/keys.ts` — canonical account name helpers and naming convention for all secret classes (`provider:<type>`, `connector:<id>:<field>`)
- Created `apps/desktop/src/main/secrets/redact.ts` — `redactSecrets`, `formatError`, `markSecret` for safe logging
- Created `apps/desktop/src/main/secrets/dev-local.ts` — `LocalDevSecretStore` backed by `.local/secrets.json`, activated by `POCKET_DEV_SECRETS=1` in non-packaged builds only
- Added `.local/` to `.gitignore` with entries for `secrets.json` and `*.db`
- Created `.local/.gitkeep` so the directory is tracked but empty
- Added 5 new IPC handlers: `credentials:listConnectors`, `credentials:setField`, `credentials:getFieldStatus`, `credentials:clearField`, `credentials:testConnection`
- Extended `preload/index.ts` and `pocket.d.ts` with the `credentials` API and `ConnectorDescriptor`/`CredentialTestResult` types
- Extended Settings page with a "Bank and Card Credentials" section: per-connector field entry, set/clear per field, test connection button, status indicators
- Removed inline `POCKET_SERVICE = 'pocket'` constant from `main/index.ts` — now imported from `keys.ts`
- Replaced `providerKeychainAccount` from `db/providers.ts` with `providerKeyAccount` from `keys.ts` everywhere
- Added 30 new tests in `tests/secrets.extended.test.ts`: CRUD lifecycle, naming convention, secrets-vs-settings separation, dev-local store persistence, redaction correctness
- Updated knowledge tree: storage layers in `20-architecture/README.md`, security and dev workflow in `30-engineering/README.md`, UX principles in `10-product/README.md`

### Decisions made

- **Single service name `pocket`** — all secrets under one service for easy keychain management; structured account names provide the namespacing
- **No list/enumerate operation** — `SecretStore` is intentionally write-biased; listing secrets is not exposed to reduce enumeration risk
- **Auth errors never expose raw values** — `testConnection` returns human-readable messages, not scraper stack traces
- **`shouldUseDevLocalStore` checks `app.isPackaged`** — impossible to activate in production, no matter what env var is set
- **Short secrets (< 4 chars) not redacted** — avoids over-redaction of common short strings in error messages

### What the next agent must read

- `apps/desktop/src/main/secrets/keys.ts` — naming convention
- `apps/desktop/src/main/secrets/redact.ts` — log safety
- `apps/desktop/src/main/secrets/dev-local.ts` — dev workflow
- `apps/desktop/src/main/index.ts` — `credentials:*` IPC handlers
- `docs/knowledge-tree/30-engineering/README.md` — security section
- `docs/knowledge-tree/20-architecture/README.md` — storage layers section

### Pending / deferred

- Connector credential IPC exposes a `testConnection` that runs a real scraper — it will fail in tests and in dev without real credentials. A mock/stub path for CI should be added when CI runs connectors.
- Only `HapoalimConnector` and `MaxConnector` are registered in the IPC handler. Adding new connectors requires updating the `CONNECTORS` array in `main/index.ts`.
- `.local/secrets.json` format is plain JSON — if a developer needs a more structured dev config, consider a TOML or YAML format in the future.
