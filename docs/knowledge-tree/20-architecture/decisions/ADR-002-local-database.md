# ADR-002 — Local Database Choice

Status: pending

## Question

What local database should store normalized transactions, accounts, and rules?

## Context

- SQLite via better-sqlite3: relational, well-understood, good Node.js bindings
- SQLite via Drizzle/Prisma: adds ORM layer (project rules prefer no ORM unless already in use)
- LevelDB / LMDB: key-value, simpler but less expressive for queries

## Decision

Not yet made. Decision must happen before Step 2 (data persistence layer).

## Criteria

- Local-only, no cloud sync required
- Must support querying by date range, category, account
- Must be embeddable in Electron or Tauri
