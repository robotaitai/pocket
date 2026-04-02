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
