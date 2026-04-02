#!/usr/bin/env node
// Checks that the repository structure follows the rules in AGENTS.md.
// Runs against git-tracked content only — ignores local gitignored artifacts.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failures++;
}

function pass(msg) {
  console.log(`ok:   ${msg}`);
}

function git(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// 1. Root entries — only approved files and folders may be tracked at root
// ---------------------------------------------------------------------------
const ALLOWED_ROOT = new Set([
  'README.md', 'AGENTS.md', 'CONTRIBUTING.md', 'LICENSE', 'CODEOWNERS',
  'package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', 'tsconfig.base.json',
  '.gitignore', '.gitmodules', '.markdownlint.json',
  '.github', '.claude', 'apps', 'packages', 'docs', 'external', 'scripts',
]);

const trackedRoot = git('git ls-tree --name-only HEAD')
  .split('\n')
  .filter(Boolean);

let rootClean = true;
for (const entry of trackedRoot) {
  if (!ALLOWED_ROOT.has(entry)) {
    fail(`unexpected tracked root entry: ${entry}`);
    rootClean = false;
  }
}
if (rootClean) pass('root contains only allowed tracked entries');

// ---------------------------------------------------------------------------
// 2. No unexpected markdown at repo root (beyond the approved three)
// ---------------------------------------------------------------------------
const ALLOWED_ROOT_MD = new Set(['README.md', 'AGENTS.md', 'CONTRIBUTING.md']);
const unexpectedRootMd = trackedRoot.filter(e => e.endsWith('.md') && !ALLOWED_ROOT_MD.has(e));
if (unexpectedRootMd.length > 0) {
  for (const f of unexpectedRootMd) fail(`unexpected markdown at root: ${f}`);
} else {
  pass('no unexpected markdown at root');
}

// ---------------------------------------------------------------------------
// 3. No markdown files directly inside scripts/ (scripts use inline comments)
// ---------------------------------------------------------------------------
const trackedScriptsMd = git("git ls-files 'scripts/*.md'").split('\n').filter(Boolean);
if (trackedScriptsMd.length > 0) {
  for (const f of trackedScriptsMd) fail(`unexpected markdown in scripts/: ${f}`);
} else {
  pass('no markdown files in scripts/');
}

// ---------------------------------------------------------------------------
// 4. Scraper submodule registered under external/ only
// ---------------------------------------------------------------------------
const gitmodulesPath = join(ROOT, '.gitmodules');
if (!existsSync(gitmodulesPath)) {
  fail('.gitmodules not found');
} else {
  const content = readFileSync(gitmodulesPath, 'utf8');
  if (content.includes('path = external/israeli-bank-scrapers')) {
    pass('scraper submodule is registered under external/israeli-bank-scrapers');
  } else {
    fail('scraper submodule not registered at external/israeli-bank-scrapers in .gitmodules');
  }
  // Fail if submodule appears anywhere else (e.g. accidentally copied into packages/)
  const otherPaths = content.match(/path\s*=\s*(.+)/g) ?? [];
  for (const p of otherPaths) {
    const path = p.replace(/path\s*=\s*/, '').trim();
    if (!path.startsWith('external/')) {
      fail(`submodule registered outside external/: ${path}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 5. .gitignore sanity — must cover common generated / local-only artifacts
// ---------------------------------------------------------------------------
const REQUIRED_IGNORE_PATTERNS = [
  'node_modules',
  'dist',
  '.env',
  '*.db',
  '*.log',
  'out',
];
const gitignorePath = join(ROOT, '.gitignore');
if (!existsSync(gitignorePath)) {
  fail('.gitignore not found');
} else {
  const content = readFileSync(gitignorePath, 'utf8');
  let ignoreClean = true;
  for (const pattern of REQUIRED_IGNORE_PATTERNS) {
    if (content.includes(pattern)) {
      pass(`.gitignore covers: ${pattern}`);
    } else {
      fail(`.gitignore missing pattern: ${pattern}`);
      ignoreClean = false;
    }
  }
}

// ---------------------------------------------------------------------------
// 6. No forbidden file types tracked in git
// ---------------------------------------------------------------------------
const FORBIDDEN_TRACKED_PATTERNS = [
  '*.db', '*.sqlite',          // local databases
  '*.csv',                      // exported data
  '.env',                       // secrets
  'secrets.enc.json',           // encrypted secret store
];

for (const pattern of FORBIDDEN_TRACKED_PATTERNS) {
  const found = git(`git ls-files '${pattern}'`).split('\n').filter(Boolean);
  if (found.length > 0) {
    for (const f of found) fail(`forbidden file tracked in git: ${f}`);
  }
}
pass('no forbidden file types tracked in git');

// ---------------------------------------------------------------------------
// 7. docs/knowledge-tree/ structure must exist
// ---------------------------------------------------------------------------
const REQUIRED_KT_BRANCHES = [
  'docs/knowledge-tree/README.md',
  'docs/knowledge-tree/00-project',
  'docs/knowledge-tree/10-product',
  'docs/knowledge-tree/20-architecture',
  'docs/knowledge-tree/30-engineering',
  'docs/knowledge-tree/40-operations',
  'docs/knowledge-tree/50-domain',
];
let ktClean = true;
for (const p of REQUIRED_KT_BRANCHES) {
  if (!existsSync(join(ROOT, p))) {
    fail(`knowledge tree branch missing: ${p}`);
    ktClean = false;
  }
}
if (ktClean) pass('knowledge tree structure is intact');

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
if (failures > 0) {
  console.error(`\nRepo hygiene check FAILED — ${failures} issue(s) found.`);
  process.exit(1);
} else {
  console.log('\nRepo hygiene check passed.');
}
