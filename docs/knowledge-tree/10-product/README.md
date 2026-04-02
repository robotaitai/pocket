# 10-product — What are we building for users?

## Target User

Israeli salaried worker with 1-3 bank accounts and 1-2 credit cards who wants to understand where their money goes without uploading their data to a third-party service.

## Core User Journeys (v1)

1. Connect a bank or credit card account and scrape transactions
2. View a chronological transaction list
3. Assign categories to transactions via rules
4. See a monthly summary by category

## Out of Scope for v1

- Budgets and forecasting
- Multi-user households
- Foreign currency accounts beyond ILS/USD
- Mobile app

## Architecture Mapping

The journeys above map to packages as follows:

- "Connect and scrape" → `@pocket/connectors-israel`
- "View transactions" → `@pocket/core-model` + `@pocket/ui`
- "Assign categories" → `@pocket/rules-engine`
- "Monthly summary" → `@pocket/insights`

## UX Principles — Credential Management

### For real users (installed app)

- Credentials are entered through the Settings UI, never by editing files
- The UI shows exactly which credential fields are required for each institution
- "Test Connection" button gives immediate feedback without exposing raw errors
- Users see confirmation that credentials stay on their device
- Secrets can be updated or removed from the same Settings screen
- Errors from auth failures are shown in plain language — never expose raw credential values or stack traces

### For developers (dev mode)

- No OS keychain prompt required for running tests — use `.local/secrets.json` with `POCKET_DEV_SECRETS=1`
- Fixture connector (`FixtureConnector`) works with no credentials at all — the default for automated tests
- `.env` may be used for non-secret config only (e.g. `POCKET_DEV_SECRETS=1`)
- Real bank credentials are never committed — `.local/` is gitignored

### Storage transparency principle

The Settings page includes a "Privacy Boundaries" panel that explains what can and cannot be sent externally. Users should always be able to understand where their credentials go.

### Secret lifecycle

1. User enters credential in Settings
2. App stores in OS keychain (keytar) — never in DB or config
3. App retrieves from keychain at connector run time only
4. User can clear a credential at any time from Settings
5. Clearing removes it from the keychain — it is gone from the device
