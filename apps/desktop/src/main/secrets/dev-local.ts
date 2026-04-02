/**
 * LocalDevSecretStore — file-backed secret store for local development only.
 *
 * Reads and writes a JSON file at `<repo-root>/.local/secrets.json`.
 * The `.local/` directory is gitignored and NEVER committed.
 *
 * IMPORTANT: This store is ONLY activated when:
 *   1. The app is NOT packaged (app.isPackaged === false), AND
 *   2. The POCKET_DEV_SECRETS environment variable is set to '1'
 *
 * Production app users always use the OS keychain (createSecretStore).
 * This path exists only so developers can run smoke tests without being
 * prompted by the OS keychain on every test run.
 *
 * File format: flat JSON object, keys are "service:account" pairs.
 * {
 *   "pocket:provider:openai": "sk-...",
 *   "pocket:connector:hapoalim:userCode": "myuser"
 * }
 *
 * NEVER commit `.local/secrets.json` — it is gitignored.
 * NEVER use this in a packaged app build.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { SecretStore } from './index.js';

/**
 * Resolve the `.local/secrets.json` path relative to the repo root.
 * In dev mode, `__dirname` is inside `apps/desktop/dist/main/secrets/`.
 * We walk up to find the repo root (the directory that contains `pnpm-workspace.yaml`).
 */
function resolveLocalSecretsPath(repoRoot?: string): string {
  const root = repoRoot ?? findRepoRoot();
  return path.join(root, '.local', 'secrets.json');
}

function findRepoRoot(): string {
  let dir = path.resolve(__dirname ?? '.');
  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    dir = path.dirname(dir);
  }
  // Fallback: current working directory
  return process.cwd();
}

async function readStore(filePath: string): Promise<Record<string, string>> {
  try {
    const contents = await readFile(filePath, 'utf-8');
    return JSON.parse(contents) as Record<string, string>;
  } catch {
    return {};
  }
}

async function writeStore(filePath: string, data: Record<string, string>): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Creates a file-backed SecretStore for local development.
 * @param repoRoot Optional override for the repo root path (useful in tests).
 */
export function createLocalDevSecretStore(repoRoot?: string): SecretStore {
  const filePath = resolveLocalSecretsPath(repoRoot);

  return {
    async get(service: string, account: string): Promise<string | null> {
      const store = await readStore(filePath);
      return store[`${service}:${account}`] ?? null;
    },

    async set(service: string, account: string, secret: string): Promise<void> {
      const store = await readStore(filePath);
      store[`${service}:${account}`] = secret;
      await writeStore(filePath, store);
    },

    async delete(service: string, account: string): Promise<void> {
      const store = await readStore(filePath);
      delete store[`${service}:${account}`];
      await writeStore(filePath, store);
    },
  };
}

/**
 * Returns true if the dev-local secret store should be used.
 * Only active in non-packaged builds with the POCKET_DEV_SECRETS env var set.
 */
export function shouldUseDevLocalStore(isPackaged: boolean): boolean {
  return !isPackaged && process.env['POCKET_DEV_SECRETS'] === '1';
}
