# Pocket

Local-first, read-only personal finance for Israeli residents.

## What it is

Pocket scrapes your Israeli bank and credit card accounts, categorizes transactions with a rule engine, and shows you where your money goes. Everything stays on your machine.

**Local-first**: raw transactions, balances, and credentials never leave your device.
**Read-only**: no write-back actions, no transfers, no payments.
**Israel-first**: built for Israeli banks and credit card networks.

## What it is not

- Not a budgeting or forecasting tool (v1)
- Not a cloud sync service (raw financial data is never uploaded)
- Not a business accounting tool

## Supported institutions

See `external/israeli-bank-scrapers/README.md` for the current list.

## Quick start

Prerequisites: Node.js 20+, pnpm 9+, git.

```sh
git clone git@github.com:robotaitai/pocket.git
cd pocket
git submodule update --init --recursive
pnpm install
pnpm typecheck
pnpm test
```

The desktop app is not yet runnable — renderer choice is pending (ADR-001). See [docs/knowledge-tree/20-architecture/decisions/ADR-001-desktop-renderer.md](docs/knowledge-tree/20-architecture/decisions/ADR-001-desktop-renderer.md).

## Repository layout

```
apps/desktop          desktop app entry point
packages/
  core-model          canonical domain types
  connectors-israel   scraper wrapper (only package touching external/)
  rules-engine        transaction categorization
  insights            aggregations and summaries
  ui                  shared React components
  shared-tag-client   optional privacy-safe tag sync
  test-fixtures       synthetic test data
external/
  israeli-bank-scrapers  git submodule (external dependency)
docs/knowledge-tree/  project knowledge — read before touching any subsystem
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Agents: see [AGENTS.md](AGENTS.md).

## Privacy

Pocket does not upload raw transaction data, balances, or account identifiers. The optional `shared-tag-client` package syncs only merchant names and category assignments — no amounts, no account details. It is disabled by default and feature-flagged at runtime.

## License

MIT — see [LICENSE](LICENSE).
