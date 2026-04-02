import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { openDb } from '../src/main/db/init.js';

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'pocket-migration-test-'));
}

const tmpDirs: string[] = [];
afterEach(() => {
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true });
});

function openTmpDb(): Database.Database {
  const dir = makeTmpDir();
  tmpDirs.push(dir);
  return openDb(join(dir, 'pocket.db'));
}

describe('Migration — schema version', () => {
  it('opens a fresh DB at schema version 2', () => {
    const db = openTmpDb();
    const row = db.prepare<[], { version: number }>('SELECT version FROM schema_version').get();
    expect(row?.version).toBe(2);
    db.close();
  });

  it('opening the same DB twice does not change the version', () => {
    const dir = makeTmpDir();
    tmpDirs.push(dir);
    const path = join(dir, 'pocket.db');
    const db1 = openDb(path);
    db1.close();
    const db2 = openDb(path);
    const row = db2.prepare<[], { version: number }>('SELECT version FROM schema_version').get();
    expect(row?.version).toBe(2);
    db2.close();
  });
});

describe('Migration V2 — new tables exist', () => {
  it('creates the import_batches table', () => {
    const db = openTmpDb();
    const row = db.prepare<[], { name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='import_batches'",
    ).get();
    expect(row?.name).toBe('import_batches');
    db.close();
  });

  it('creates the merchants table', () => {
    const db = openTmpDb();
    const row = db.prepare<[], { name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='merchants'",
    ).get();
    expect(row?.name).toBe('merchants');
    db.close();
  });

  it('transactions table has all provenance columns', () => {
    const db = openTmpDb();
    const cols = db
      .prepare<[], { name: string }>("PRAGMA table_info('transactions')")
      .all()
      .map((r) => r.name);

    const expected = [
      'schema_version', 'import_batch_id', 'source_type', 'source_file',
      'import_timestamp', 'extraction_method', 'provider_used',
      'extractor_version', 'raw_reference', 'confidence_score', 'warnings', 'merchant_id',
    ];
    for (const col of expected) {
      expect(cols, `Missing column: ${col}`).toContain(col);
    }
    db.close();
  });
});

describe('Migration V2 — forward compatibility', () => {
  it('can insert and retrieve an import batch', () => {
    const db = openTmpDb();
    db.prepare(`
      INSERT INTO import_batches (id, created_at, source_type, account_ids, transaction_count, status, extraction_method)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('batch-001', new Date().toISOString(), 'scraper', '[]', 0, 'completed', 'scraper');

    const row = db.prepare<[], { id: string }>('SELECT id FROM import_batches').get();
    expect(row?.id).toBe('batch-001');
    db.close();
  });

  it('can insert a merchant', () => {
    const db = openTmpDb();
    db.prepare(`
      INSERT INTO merchants (id, normalized_name, aliases, category)
      VALUES (?, ?, ?, ?)
    `).run('merch-001', 'Shufersal', JSON.stringify(['שופרסל', 'Shufersal Deal']), 'groceries');

    const row = db.prepare<[], { normalized_name: string }>('SELECT normalized_name FROM merchants').get();
    expect(row?.normalized_name).toBe('Shufersal');
    db.close();
  });

  it('transactions with provenance columns can be inserted', () => {
    const db = openTmpDb();
    // Insert a required account first
    db.prepare(`
      INSERT INTO accounts (id, institution, institution_type, account_number, type, currency)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('acc-001', 'hapoalim', 'bank', '000-001', 'bank', 'ILS');

    db.prepare(`
      INSERT INTO transactions (
        id, account_id, date, processed_date, amount, original_amount,
        original_currency, charged_currency, description, status,
        schema_version, import_batch_id, source_type, import_timestamp,
        extraction_method, warnings
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'tx-001', 'acc-001', '2026-03-01', '2026-03-02',
      -250, -250, 'ILS', 'ILS', 'Supermarket', 'completed',
      2, 'batch-001', 'scraper', new Date().toISOString(), 'scraper', '[]',
    );

    const row = db
      .prepare<[], { import_batch_id: string; source_type: string }>('SELECT import_batch_id, source_type FROM transactions')
      .get();
    expect(row?.import_batch_id).toBe('batch-001');
    expect(row?.source_type).toBe('scraper');
    db.close();
  });
});

describe('Migration — V1 → V2 forward migration', () => {
  it('a DB that starts with v1 schema gets migrated to v2', () => {
    const dir = makeTmpDir();
    tmpDirs.push(dir);
    const path = join(dir, 'pocket.db');

    // Simulate a v1 database by creating it without v2 tables
    const legacyDb = new Database(path);
    legacyDb.exec(`
      CREATE TABLE schema_version (version INTEGER NOT NULL);
      INSERT INTO schema_version (version) VALUES (1);
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE accounts (
        id TEXT PRIMARY KEY, institution TEXT NOT NULL, institution_type TEXT NOT NULL,
        account_number TEXT NOT NULL, type TEXT NOT NULL, currency TEXT NOT NULL, label TEXT
      );
      CREATE TABLE transactions (
        id TEXT PRIMARY KEY, account_id TEXT NOT NULL,
        date TEXT NOT NULL, processed_date TEXT NOT NULL,
        amount REAL NOT NULL, original_amount REAL NOT NULL,
        original_currency TEXT NOT NULL, charged_currency TEXT NOT NULL,
        description TEXT NOT NULL, memo TEXT, status TEXT NOT NULL,
        category TEXT, installment_number INTEGER, installment_total INTEGER, reference_id TEXT
      );
    `);
    legacyDb.close();

    // Re-open through openDb — should detect v1 and run v2 migration
    const migratedDb = openDb(path);

    const versionRow = migratedDb
      .prepare<[], { version: number }>('SELECT version FROM schema_version')
      .get();
    expect(versionRow?.version).toBe(2);

    const batchTable = migratedDb
      .prepare<[], { name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='import_batches'")
      .get();
    expect(batchTable?.name).toBe('import_batches');

    migratedDb.close();
  });
});
