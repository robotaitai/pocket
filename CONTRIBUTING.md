# Contributing to Pocket

## Before you start

Read the relevant knowledge tree branch before touching any subsystem:

```sh
cat docs/knowledge-tree/README.md
```

The table there maps every subsystem to its branch. Agents: see [AGENTS.md](AGENTS.md).

## Setup

```sh
git clone git@github.com:robotaitai/pocket.git
cd pocket
git submodule update --init --recursive
pnpm install
pnpm typecheck
pnpm test
pnpm lint:md
```

## Ground rules

**Local-first**: no change may cause raw transaction data, balances, or account identifiers to leave the device. If your change touches network I/O, document the exact payload in your PR and confirm it contains no financial data.

**Read-only**: no write-back actions to banks or card issuers. Period.

**Scraper isolation**: only `@pocket/connectors-israel` may import from `external/israeli-bank-scrapers`. All other packages consume `@pocket/core-model` types.

**No ORMs**: use raw SQL or query builders. The project does not use an ORM unless one is already in use.

**No new dependencies without discussion**: open an issue first.

## Package conventions

Each package must have:

- `package.json` with `typecheck` and `test` scripts
- `tsconfig.json` extending `../../tsconfig.base.json`
- `src/index.ts` as the barrel export
- A README explaining what the package does

## Knowledge tree updates

After any non-trivial change:

- Update the relevant leaf doc in `docs/knowledge-tree/`
- Update the parent branch README if behavior changed
- Add an entry to `docs/knowledge-tree/40-operations/handoffs.md`
- Add an entry to `docs/knowledge-tree/40-operations/known-issues.md` if a real issue was found

## Pull requests

Use the PR template. All checklist items must be addressed (not necessarily checked — explain why if N/A).

## Submodule updates

Pin the scraper submodule to a specific commit SHA. Update via a dedicated PR:

```sh
cd external/israeli-bank-scrapers
git fetch origin
git checkout <target-sha>
cd ../..
git add external/israeli-bank-scrapers
git commit -m "chore: update scraper submodule to <sha>"
```

Never modify files inside `external/` from this repo.
