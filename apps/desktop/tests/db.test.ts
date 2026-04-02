import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDb } from '../src/main/db/init.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type Database from 'better-sqlite3';

describe('openDb', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = openDb(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('creates the settings table', () => {
    const row = db
      .prepare<[], { name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='settings'",
      )
      .get();
    expect(row?.name).toBe('settings');
  });

  it('creates the accounts table', () => {
    const row = db
      .prepare<[], { name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'",
      )
      .get();
    expect(row?.name).toBe('accounts');
  });

  it('creates the transactions table', () => {
    const row = db
      .prepare<[], { name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'",
      )
      .get();
    expect(row?.name).toBe('transactions');
  });

  it('records the schema version', () => {
    const row = db
      .prepare<[], { version: number }>('SELECT version FROM schema_version')
      .get();
    expect(row?.version).toBe(1);
  });

  it('is idempotent — running migrations twice does not throw', () => {
    expect(() => openDb(':memory:')).not.toThrow();
  });

  it('enables WAL mode (requires a real file — in-memory always uses "memory" mode)', () => {
    // SQLite in-memory DBs cannot use WAL; test against a temp file DB
    const tmpDir = mkdtempSync(join(tmpdir(), 'pocket-test-'));
    const fileDb = openDb(join(tmpDir, 'test.db'));
    try {
      const mode = fileDb.pragma('journal_mode', { simple: true });
      expect(mode).toBe('wal');
    } finally {
      fileDb.close();
      rmSync(tmpDir, { recursive: true });
    }
  });

  it('enables foreign keys', () => {
    const row = db.pragma('foreign_keys', { simple: true });
    expect(row).toBe(1);
  });
});
