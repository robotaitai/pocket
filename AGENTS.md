# AGENTS.md — Instructions for AI Agents

This file governs how AI agents (Claude Code, automated PR bots, etc.) must behave in this repository.

## Mandatory: read the knowledge tree before coding

Identify the relevant branch, read it fully, then summarize constraints in your working notes or PR.

```
docs/knowledge-tree/README.md           navigation index
docs/knowledge-tree/00-project/         why this exists, non-goals
docs/knowledge-tree/10-product/         user journeys, scope
docs/knowledge-tree/20-architecture/    package graph, isolation rules, ADRs
docs/knowledge-tree/30-engineering/     setup, workspace layout, conventions
docs/knowledge-tree/40-operations/      CI, handoffs, known issues
docs/knowledge-tree/50-domain/          Israeli banking glossary
```

Read a full branch: start at `README.md`, follow every file linked from it.

## Mandatory: update the knowledge tree after coding

- Update leaf docs in the relevant branch
- Update parent branch README if behavior changed
- Append to `docs/knowledge-tree/40-operations/handoffs.md`
- Append to `docs/knowledge-tree/40-operations/known-issues.md` if a real issue was found

## Hard constraints

**Privacy**: never write code that uploads raw transaction data, balances, or account identifiers. If network I/O is required, document the exact payload in a comment and confirm it contains no financial data.

**Read-only**: no write-back actions to banks or card providers.

**Scraper isolation**: only `packages/connectors-israel/` may import from `external/israeli-bank-scrapers/`. Do not add imports from `external/` in any other package.

**No ORMs**: unless the project already uses one at the time of your change.

**No new runtime dependencies** without a comment explaining why no existing solution works.

## Step execution rules

- Execute instructions step by step
- Do not skip a step unless you document why in the knowledge tree and in `handoffs.md`
- Mark a step done only after verifying it passes CI checks locally
- If a scraper fix is needed: document the issue in `known-issues.md`, patch the fork only when necessary, keep pocket logic outside the scraper repo

## Code quality

- Simplicity first: minimal impact, only touch what is necessary
- Find root causes — no temporary fixes
- No speculative abstractions: solve the task as stated
- Tests must be real, not mocked at the database layer

## Repo cleanliness rule

Keep the repository structurally clean.

- Do not add new root-level files or folders unless clearly justified.
- Put durable project knowledge under `/docs/knowledge-tree/`.
- Put reusable code under `/packages/`.
- Put app entrypoints under `/apps/`.
- Put external/submodule dependencies under `/external/`.
- Put automation or helper scripts under `/scripts/`.
- Keep tool-specific config isolated, for example `.claude/` or `.cursor/rules/`.
- Do not create scratch files, duplicate docs, or vague folders like `misc`, `temp`, or `notes-final`.
- If a new file has no obvious home, stop and place it deliberately rather than adding clutter.

## Handoff format

When completing a step, append to `docs/knowledge-tree/40-operations/handoffs.md`:

```
## Step N — <title> — <date>

### What was done
<bullet list>

### Decisions made
<bullet list — include rationale>

### What the next agent must read
<file paths>

### Pending / deferred
<anything not done and why>
```
