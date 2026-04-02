# Pull Request

## Summary

<!-- What does this PR do? One or two sentences. -->

## Knowledge tree

- [ ] Read the relevant branch(es) before making changes
- [ ] Updated leaf doc(s) in `docs/knowledge-tree/`
- [ ] Updated parent branch README if behavior changed
- [ ] Appended to `docs/knowledge-tree/40-operations/handoffs.md`
- [ ] Appended to `docs/knowledge-tree/40-operations/known-issues.md` if a real issue was found (or: N/A)

## Privacy check

Does this change involve network I/O or data leaving the device?

- [ ] No
- [ ] Yes — describe exact payload below and confirm it contains no raw transactions, balances, or account identifiers

<!-- If yes, describe the payload: -->

## Tests

- [ ] New behavior is covered by tests (or: explain why not)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm lint:md` passes

## Scraper boundary

Does this PR add or modify imports from `external/israeli-bank-scrapers`?

- [ ] No
- [ ] Yes — change is inside `packages/connectors-israel/` only

## Checklist

- [ ] No new runtime dependencies added without justification
- [ ] No ORMs introduced
- [ ] No write-back actions added
