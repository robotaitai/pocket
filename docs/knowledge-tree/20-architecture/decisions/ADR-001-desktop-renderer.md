# ADR-001 — Desktop Renderer Choice

Status: pending

## Question

Should the desktop app use Electron or Tauri as the renderer framework?

## Context

- Electron: mature, large ecosystem, ships its own Chromium, larger bundle size
- Tauri: Rust-based, uses OS webview, smaller bundle, stricter security model

## Decision

Not yet made. Decision must happen before Step 1 (desktop app scaffold).

## Criteria

- macOS and Windows support required
- Bundle size matters for distribution
- Rust expertise on team is unknown
