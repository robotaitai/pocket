# 40-operations — How is it built, tested, and released?

## CI Pipeline

All jobs run in parallel on `ubuntu-latest` via GitHub Actions (`.github/workflows/ci.yml`).

| Job | What it checks |
|---|---|
| `install` | `pnpm install --frozen-lockfile` succeeds |
| `verify-submodule` | `external/israeli-bank-scrapers` is present and contains `package.json` |
| `lint-markdown` | All `.md` files pass markdownlint |
| `typecheck` | `pnpm typecheck` passes across all packages |
| `test` | `pnpm test` passes across all packages |

## Reading CI Failures

- `install` fails: check `pnpm-lock.yaml` is committed and up-to-date
- `verify-submodule` fails: run `git submodule update --init --recursive` locally and commit `.gitmodules`
- `lint-markdown` fails: run `pnpm lint:md` locally to see which files have issues
- `typecheck` fails: run `pnpm typecheck` locally; fix the TypeScript error in the named package

## Release Process

Not defined at Step 0. See ADR-002 for database choice, which will inform packaging.

## Submodule Update Policy

Pin the scraper submodule to a specific commit SHA. Update it in a dedicated PR with:

```sh
cd external/israeli-bank-scrapers
git fetch origin
git checkout <target-sha>
cd ../..
git add external/israeli-bank-scrapers
git commit -m "chore: update scraper submodule to <sha>"
```
