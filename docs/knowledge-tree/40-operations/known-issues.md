# Known Issues

Append when a real issue is found. Never delete entries — mark as resolved instead.

Format:

```
## <date> — <title>
Status: open | resolved (<date>)
Package: <affected package or "repo">
Description: <what the issue is>
Resolution: <how it was fixed, or "pending">
```

---

## 2026-04-02 — Desktop renderer not yet chosen

Status: open
Package: apps/desktop
Description: ADR-001 is pending. The desktop app is a stub. `pnpm dev` in apps/desktop prints a placeholder message. No runnable app exists yet.
Resolution: pending — resolve in Step 2 after ADR-001 is decided.

## 2026-04-02 — Local database not yet chosen

Status: open
Package: repo
Description: ADR-002 is pending. No data persistence layer exists. Transaction data cannot be stored between scrape runs.
Resolution: pending — resolve in Step 2 after ADR-002 is decided.

## 2026-04-02 — Electron native modules require rebuild for packaged distribution

Status: open
Package: apps/desktop
Description: better-sqlite3 and keytar are native Node.js modules. They install and work for development and CI tests (compiled for the system Node), but for a packaged Electron app they must be rebuilt against Electron's Node via `@electron/rebuild`. This is not yet wired into the build pipeline.
Resolution: pending — address when packaging/distribution is planned.

## 2026-04-02 — Desktop renderer resolved

Status: resolved (2026-04-02)
Package: apps/desktop
Description: ADR-001 was pending. Now resolved: Electron chosen.
Resolution: ADR-001 updated to accepted. Electron app scaffold in place.

## 2026-04-02 — Local database resolved

Status: resolved (2026-04-02)
Package: repo
Description: ADR-002 was pending. Now resolved: better-sqlite3 chosen.
Resolution: ADR-002 updated to accepted. DB layer implemented in apps/desktop/src/main/db/.
