# 30-engineering — How do I set up and contribute?

## Prerequisites

- Node.js 20+
- pnpm 9+
- git

## Setup

```sh
git clone git@github.com:robotaitai/pocket.git
cd pocket
git submodule update --init --recursive
pnpm install
pnpm typecheck
pnpm test
```

## Workspace Layout

- `apps/` — end-user applications (desktop app)
- `packages/` — shared libraries; consumed by apps and each other
- `external/` — git submodules; treated as opaque external dependencies
- `docs/` — project knowledge; read before touching any subsystem
- `scripts/` — build and maintenance scripts
- `.github/` — CI workflows

## Adding a New Package

1. Create `packages/<name>/` with `package.json`, `tsconfig.json`, `src/index.ts`
2. Name it `@pocket/<name>`
3. Extend `../../tsconfig.base.json` in tsconfig
4. Add a `typecheck` script: `tsc --noEmit`
5. Add a `test` script (stub if no tests yet)
6. Register it in `pnpm-workspace.yaml` (already covered by `packages/*`)
7. Add a README explaining its purpose

## Lint and Typecheck

```sh
pnpm typecheck     # TypeScript across all packages
pnpm lint:md       # Markdown lint across all docs
```

## Submodule Policy

- The scraper submodule is pinned to a specific commit SHA
- Update it intentionally via a dedicated PR
- Never modify files inside `external/` from this repo
