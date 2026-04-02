# ADR-002 — Local Database Choice

Status: accepted

## Question

What local database should store normalized transactions, accounts, and rules?

## Context

- SQLite via better-sqlite3: relational, well-understood, good Node.js bindings
- SQLite via Drizzle/Prisma: adds ORM layer (project rules prefer no ORM unless already in use)
- LevelDB / LMDB: key-value, simpler but less expressive for queries

## Decision

**SQLite via better-sqlite3 (no ORM)**. Reasons:

- Project rules prohibit introducing an ORM
- better-sqlite3 is synchronous, which simplifies Electron main-process DB calls
- Supports date-range, category, and account queries with plain SQL
- Embeds cleanly in Electron; native bindings well-maintained
- WAL mode provides good read/write concurrency for the single-user case

## Criteria

- Local-only, no cloud sync required — SQLite is file-based, fully local
- Must support querying by date range, category, account — satisfied by SQL indexes
- Must be embeddable in Electron or Tauri — better-sqlite3 supports Electron natively
