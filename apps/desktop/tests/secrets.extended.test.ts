/**
 * Extended secret storage tests.
 * Covers: naming convention, separation from settings, dev-local store,
 * redaction, and create/read/update/delete lifecycle.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createNullSecretStore } from '../src/main/secrets/index.js';
import { createLocalDevSecretStore, shouldUseDevLocalStore } from '../src/main/secrets/dev-local.js';
import { POCKET_SERVICE, providerKeyAccount, connectorCredentialAccount, isKnownAccountFormat } from '../src/main/secrets/keys.js';
import { redactSecrets, formatError, markSecret } from '../src/main/secrets/redact.js';
import { openDb } from '../src/main/db/init.js';
import type Database from 'better-sqlite3';

// ── Secret store CRUD lifecycle ───────────────────────────────────────────────

describe('SecretStore (in-memory)', () => {
  it('stores and retrieves a secret', async () => {
    const store = createNullSecretStore();
    await store.set('svc', 'acc', 'my-secret');
    expect(await store.get('svc', 'acc')).toBe('my-secret');
  });

  it('returns null for missing accounts', async () => {
    const store = createNullSecretStore();
    expect(await store.get('svc', 'missing')).toBeNull();
  });

  it('updates an existing secret', async () => {
    const store = createNullSecretStore();
    await store.set('svc', 'acc', 'original');
    await store.set('svc', 'acc', 'updated');
    expect(await store.get('svc', 'acc')).toBe('updated');
  });

  it('deletes a secret', async () => {
    const store = createNullSecretStore();
    await store.set('svc', 'acc', 'todelete');
    await store.delete('svc', 'acc');
    expect(await store.get('svc', 'acc')).toBeNull();
  });

  it('isolates secrets by service and account', async () => {
    const store = createNullSecretStore();
    await store.set('svc-a', 'acc', 'secret-a');
    await store.set('svc-b', 'acc', 'secret-b');
    expect(await store.get('svc-a', 'acc')).toBe('secret-a');
    expect(await store.get('svc-b', 'acc')).toBe('secret-b');
  });
});

// ── Naming convention ─────────────────────────────────────────────────────────

describe('secret key naming convention', () => {
  it('providerKeyAccount returns correct format', () => {
    expect(providerKeyAccount('openai')).toBe('provider:openai');
    expect(providerKeyAccount('anthropic')).toBe('provider:anthropic');
  });

  it('connectorCredentialAccount returns correct format', () => {
    expect(connectorCredentialAccount('hapoalim', 'userCode')).toBe('connector:hapoalim:userCode');
    expect(connectorCredentialAccount('max', 'password')).toBe('connector:max:password');
  });

  it('POCKET_SERVICE is "pocket"', () => {
    expect(POCKET_SERVICE).toBe('pocket');
  });

  it('isKnownAccountFormat accepts structured names', () => {
    expect(isKnownAccountFormat('provider:openai')).toBe(true);
    expect(isKnownAccountFormat('connector:hapoalim:userCode')).toBe(true);
  });

  it('isKnownAccountFormat rejects freeform names', () => {
    expect(isKnownAccountFormat('random-account')).toBe(false);
    expect(isKnownAccountFormat('')).toBe(false);
  });
});

// ── Secrets vs settings separation ───────────────────────────────────────────

describe('secrets vs settings separation', () => {
  let db: Database.Database;

  beforeEach(() => { db = openDb(':memory:'); });
  afterEach(() => { db.close(); });

  it('settings table does not contain secret values', async () => {
    const store = createNullSecretStore();
    const secretValue = 'sk-super-secret-api-key';
    await store.set(POCKET_SERVICE, providerKeyAccount('openai'), secretValue);

    // Settings table should have no trace of the secret
    const rows = db.prepare('SELECT * FROM settings').all() as { key: string; value: string }[];
    const found = rows.some((r) => r.value.includes(secretValue));
    expect(found).toBe(false);
  });

  it('secrets can coexist with settings without interference', async () => {
    const store = createNullSecretStore();
    db.prepare("INSERT INTO settings (key, value) VALUES ('theme', 'dark')").run();

    await store.set(POCKET_SERVICE, providerKeyAccount('openai'), 'sk-test');
    const theme = db.prepare("SELECT value FROM settings WHERE key = 'theme'").get() as { value: string };
    expect(theme.value).toBe('dark');
    expect(await store.get(POCKET_SERVICE, providerKeyAccount('openai'))).toBe('sk-test');
  });
});

// ── LocalDevSecretStore ───────────────────────────────────────────────────────

describe('LocalDevSecretStore', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(tmpdir(), 'pocket-dev-secrets-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('stores and retrieves a secret from a temp file', async () => {
    const store = createLocalDevSecretStore(tmpDir);
    await store.set('pocket', 'provider:openai', 'sk-dev-test');
    expect(await store.get('pocket', 'provider:openai')).toBe('sk-dev-test');
  });

  it('returns null for missing key', async () => {
    const store = createLocalDevSecretStore(tmpDir);
    expect(await store.get('pocket', 'provider:openai')).toBeNull();
  });

  it('updates an existing secret in the file', async () => {
    const store = createLocalDevSecretStore(tmpDir);
    await store.set('pocket', 'provider:openai', 'sk-original');
    await store.set('pocket', 'provider:openai', 'sk-updated');
    expect(await store.get('pocket', 'provider:openai')).toBe('sk-updated');
  });

  it('deletes a secret from the file', async () => {
    const store = createLocalDevSecretStore(tmpDir);
    await store.set('pocket', 'provider:openai', 'sk-todelete');
    await store.delete('pocket', 'provider:openai');
    expect(await store.get('pocket', 'provider:openai')).toBeNull();
  });

  it('persists across store instances (same tmpDir)', async () => {
    const store1 = createLocalDevSecretStore(tmpDir);
    await store1.set('pocket', 'connector:hapoalim:userCode', 'myuser');

    const store2 = createLocalDevSecretStore(tmpDir);
    expect(await store2.get('pocket', 'connector:hapoalim:userCode')).toBe('myuser');
  });
});

describe('shouldUseDevLocalStore', () => {
  it('returns false for packaged builds regardless of env', () => {
    expect(shouldUseDevLocalStore(true)).toBe(false);
  });

  it('returns false in dev when POCKET_DEV_SECRETS is not set', () => {
    const prev = process.env['POCKET_DEV_SECRETS'];
    delete process.env['POCKET_DEV_SECRETS'];
    expect(shouldUseDevLocalStore(false)).toBe(false);
    if (prev !== undefined) process.env['POCKET_DEV_SECRETS'] = prev;
  });

  it('returns true in dev when POCKET_DEV_SECRETS=1', () => {
    const prev = process.env['POCKET_DEV_SECRETS'];
    process.env['POCKET_DEV_SECRETS'] = '1';
    expect(shouldUseDevLocalStore(false)).toBe(true);
    if (prev !== undefined) process.env['POCKET_DEV_SECRETS'] = prev; else delete process.env['POCKET_DEV_SECRETS'];
  });
});

// ── No-secret logging ─────────────────────────────────────────────────────────

describe('redactSecrets', () => {
  it('replaces a secret value with [REDACTED]', () => {
    const result = redactSecrets('Error: invalid key sk-abc123def', ['sk-abc123def']);
    expect(result).toBe('Error: invalid key [REDACTED]');
    expect(result).not.toContain('sk-abc123def');
  });

  it('replaces multiple secrets', () => {
    const result = redactSecrets('user: alice, pass: hunter2', ['alice', 'hunter2']);
    expect(result).not.toContain('alice');
    expect(result).not.toContain('hunter2');
    expect(result).toContain('[REDACTED]');
  });

  it('ignores null and undefined secrets', () => {
    const result = redactSecrets('some message', [null, undefined]);
    expect(result).toBe('some message');
  });

  it('ignores short secrets (< 4 chars) to avoid over-redaction', () => {
    const result = redactSecrets('error: at line 1', ['at']);
    expect(result).toBe('error: at line 1');
  });

  it('replaces all occurrences, not just the first', () => {
    const result = redactSecrets('key=secret key=secret', ['secret']);
    expect(result).toBe('key=[REDACTED] key=[REDACTED]');
  });
});

describe('formatError', () => {
  it('formats an Error object safely', () => {
    const err = new Error('invalid api key: sk-abc123');
    const result = formatError(err, { secrets: ['sk-abc123'] });
    expect(result).not.toContain('sk-abc123');
    expect(result).toContain('[REDACTED]');
  });

  it('adds prefix when provided', () => {
    const result = formatError(new Error('timeout'), { prefix: 'Hapoalim' });
    expect(result).toBe('Hapoalim: timeout');
  });

  it('handles non-Error values', () => {
    expect(formatError('plain string error')).toBe('plain string error');
  });
});

describe('markSecret', () => {
  it('serializes as [secret] in JSON', () => {
    const obj = { apiKey: markSecret('sk-real'), label: 'test' };
    const json = JSON.stringify(obj);
    expect(json).not.toContain('sk-real');
    expect(json).toContain('[secret]');
  });

  it('converts to [secret] string', () => {
    expect(String(markSecret('hidden'))).toBe('[secret]');
  });
});
