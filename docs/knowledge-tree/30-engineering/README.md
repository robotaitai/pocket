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

## Secret Handling

### Storage model

| What | Where | Never in |
|---|---|---|
| Bank credentials | OS keychain | `.env`, DB, config files |
| Provider API keys | OS keychain | `.env`, DB, settings table |
| App preferences | SQLite `settings` table | Keychain |
| Transaction data | SQLite core tables | Keychain |

### Naming convention

All keychain entries use service `pocket` and structured account names:

- `provider:<type>` — AI provider API key (openai, anthropic, gemini)
- `connector:<id>:<field>` — scraper credential (e.g. `connector:hapoalim:userCode`)

See `apps/desktop/src/main/secrets/keys.ts`.

### Developer workflow

For local smoke tests, create `.local/secrets.json` (gitignored) with dev credentials:

```json
{
  "pocket:provider:openai": "sk-...",
  "pocket:connector:hapoalim:userCode": "myuser",
  "pocket:connector:hapoalim:password": "mypassword"
}
```

Activate with `POCKET_DEV_SECRETS=1`. Never used in packaged builds.
Implementation: `apps/desktop/src/main/secrets/dev-local.ts`.

### Production user workflow

Real users enter credentials via the Settings UI, which stores them in the OS keychain.
No `.env` file is ever required for end users.

### Log redaction

Use `redactSecrets(message, [secret1, secret2])` from `apps/desktop/src/main/secrets/redact.ts`
before including any user-supplied value in a log or error message.
Auth error messages from connectors must never expose the credential value.

### .env policy

`.env` may be used ONLY for developer config that is not a credential:

- `POCKET_DEV_SECRETS=1` — activate the dev-local secret store
- `NODE_ENV=test` — set by test runners automatically
- Never: API keys, passwords, or tokens

`.env.local` (gitignored) is an acceptable alternative for developers who prefer
not to set env vars in their shell profile.
