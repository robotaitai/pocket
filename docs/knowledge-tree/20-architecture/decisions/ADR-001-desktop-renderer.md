# ADR-001 — Desktop Renderer Choice

Status: accepted

## Question

Should the desktop app use Electron or Tauri as the renderer framework?

## Context

- Electron: mature, large ecosystem, ships its own Chromium, larger bundle size
- Tauri: Rust-based, uses OS webview, smaller bundle, stricter security model

## Decision

**Electron**. Reasons:
- No Rust expertise required; the team knows Node.js and TypeScript
- `better-sqlite3` (ADR-002) has native Electron bindings with no extra tooling
- `keytar` for OS secret storage integrates cleanly in an Electron main process
- Shipping Chromium is acceptable for a local-first private tool with no distribution size pressure
- Electron 35+ ships Node 22, which satisfies the israeli-bank-scrapers engine requirement

## Criteria

- macOS and Windows support required — both supported by Electron
- Bundle size matters for distribution — acceptable trade-off for local-first tool
- Rust expertise on team is unknown — Rust not required with Electron
