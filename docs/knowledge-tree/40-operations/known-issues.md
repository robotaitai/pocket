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
