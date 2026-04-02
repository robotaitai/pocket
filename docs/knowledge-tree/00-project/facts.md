# 00-project — Durable Project Facts

Facts that are stable and unlikely to change. Update only when a fundamental decision changes.

## Identity

- **Name**: Pocket
- **Type**: Desktop app (local web UI)
- **Audience**: Israeli private individuals
- **Owner**: @robotaitai
- **Repository**: git@github.com:robotaitai/pocket.git
- **License**: MIT

## Core constraints (non-negotiable)

1. Raw financial data stays on device
2. Credentials stay on device
3. Read-only: no write-back to banks or card issuers
4. .env must not be the primary credential store
5. `@pocket/connectors-israel` is the only package that may import from `external/israeli-bank-scrapers`

## Privacy boundary

The only data allowed to leave the device is merchant names and category assignments — and only when the user explicitly enables `@pocket/shared-tag-client`. No amounts, no account identifiers, no balances may ever be uploaded.

## Scraper source

`external/israeli-bank-scrapers` — fork at git@github.com:robotaitai/israeli-bank-scrapers.git

Treat as an external dependency. Patch the fork only when necessary. Document scraper-specific issues in `docs/knowledge-tree/40-operations/known-issues.md`.

## Technology baseline

- Runtime: Node.js 20+
- Package manager: pnpm 9
- Language: TypeScript ~5.5 (strict mode)
- Monorepo: pnpm workspaces
- Desktop renderer: TBD (Electron vs Tauri — see ADR-001)
- Database: TBD (see ADR-002)

## Step log

| Step | Title | Status |
|---|---|---|
| 0 | Repo skeleton, knowledge tree, submodule | Done |
| 1 | Foundation and workspace bootstrap | Done |
