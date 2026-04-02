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
