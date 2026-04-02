#!/usr/bin/env bash
# Verifies that required files exist in the repository.
set -euo pipefail

REQUIRED=(
  "README.md"
  "CONTRIBUTING.md"
  "AGENTS.md"
  "LICENSE"
  "CODEOWNERS"
  ".github/pull_request_template.md"
  ".github/ISSUE_TEMPLATE/bug_report.yml"
  ".github/ISSUE_TEMPLATE/feature_request.yml"
  "docs/knowledge-tree/README.md"
  "docs/knowledge-tree/00-project/README.md"
  "docs/knowledge-tree/00-project/facts.md"
  "docs/knowledge-tree/10-product/README.md"
  "docs/knowledge-tree/20-architecture/README.md"
  "docs/knowledge-tree/30-engineering/README.md"
  "docs/knowledge-tree/40-operations/README.md"
  "docs/knowledge-tree/40-operations/handoffs.md"
  "docs/knowledge-tree/40-operations/known-issues.md"
  "docs/knowledge-tree/50-domain/README.md"
  "pnpm-workspace.yaml"
  "tsconfig.base.json"
)

FAILED=0
for f in "${REQUIRED[@]}"; do
  if [ ! -f "$f" ]; then
    echo "MISSING: $f"
    FAILED=1
  fi
done

if [ "$FAILED" -eq 1 ]; then
  echo "Structure check failed."
  exit 1
fi

echo "Structure check passed."
