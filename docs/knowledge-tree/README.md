# Pocket — Knowledge Tree

Pocket is a local-first personal finance app for Israeli residents. It scrapes transaction data from Israeli bank and credit card providers, categorizes transactions with a rule engine, and presents insights in a native desktop app. Data never leaves the device unless the user explicitly enables sync.

## Architecture Map

| Package | Role |
|---|---|
| `@pocket/core-model` | Canonical domain types: Transaction, Account, Balance, Currency |
| `@pocket/connectors-israel` | Wraps the scraper submodule; adapts output to core-model types |
| `@pocket/rules-engine` | Applies user-defined rules to categorize transactions |
| `@pocket/insights` | Aggregations: burn rate, category breakdown, recurring detection |
| `@pocket/ui` | Shared React component library |
| `@pocket/shared-tag-client` | Optional sync for privacy-safe merchant/category suggestions |
| `@pocket/test-fixtures` | Synthetic data for tests only |
| `@pocket/desktop` | Desktop app entry point (renderer TBD — see ADR-001) |
| `external/israeli-bank-scrapers` | Git submodule; external dependency — never import directly |

## Navigation

| Branch | Answers the question |
|---|---|
| [00-project](./00-project/README.md) | What is this and why does it exist? |
| [10-product](./10-product/README.md) | What are we building for users? |
| [20-architecture](./20-architecture/README.md) | How is the system structured? |
| [30-engineering](./30-engineering/README.md) | How do I set up and contribute? |
| [40-operations](./40-operations/README.md) | How is it built, tested, and released? |
| [50-domain](./50-domain/README.md) | What do Israeli banking terms mean? |

## Quick Start

```sh
git clone git@github.com:robotaitai/pocket.git
cd pocket
git submodule update --init --recursive
pnpm install
pnpm typecheck
```
