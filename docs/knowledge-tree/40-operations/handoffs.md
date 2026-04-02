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
