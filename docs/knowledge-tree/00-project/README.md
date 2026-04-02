# 00-project — What is Pocket and why does it exist?

## Vision

Pocket exists because Israeli personal finance software is either cloud-only (requiring users to upload sensitive transaction data), English-only, or focused on business use. Pocket is a local-first, privacy-preserving alternative for Israeli private users.

## Core Principles

- **Local-first**: raw financial data stays on device
- **Read-only**: no write-back to bank or credit card accounts
- **Private**: credentials stay on device; no .env as primary credential storage
- **Israel-first**: supports Israeli banks and credit card networks natively

## Non-Goals

- No cloud sync of raw transactions or balances by default
- No multi-user household support at v1
- No write-back actions (transfers, payments)
- No upload of account identifiers or balance data to any online service

## Decisions Log

ADR files live in [../20-architecture/decisions/](../20-architecture/decisions/).

- ADR-001: Desktop renderer choice (Electron vs Tauri) — pending
- ADR-002: Local database choice — pending
