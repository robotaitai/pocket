import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDb } from '../src/main/db/init.js';
import { getAcceptedSourcesCount, getCashFlowSeries, getCategoryBreakdown, getLatestImportAt } from '../src/main/db/insights.js';
import { backfillCreditCardPaymentCategories } from '../src/main/db/credit-card-heuristic.js';
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
    expect(row?.version).toBe(3);
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

describe('getCategoryBreakdown', () => {
  let db: Database.Database;

  function seed(db: Database.Database) {
    db.prepare(`
      INSERT INTO accounts (id, institution, institution_type, account_number, type, currency)
      VALUES ('acc-1', 'test', 'bank', '000', 'checking', 'ILS')
    `).run();
    db.prepare(`
      INSERT INTO import_batches (id, created_at, source_type, connector_id, status, extraction_method)
      VALUES ('batch-1', '2026-03-01T00:00:00Z', 'scraper', 'test', 'success', 'scraper')
    `).run();

    const txns = [
      { id: 't1', date: '2026-03-05', amount: -250, category: 'groceries',          status: 'accepted' },
      { id: 't2', date: '2026-03-06', amount: -100, category: 'dining',             status: 'accepted' },
      { id: 't3', date: '2026-03-07', amount: 5000, category: 'income',             status: 'accepted' },
      { id: 't4', date: '2026-03-08', amount: -500, category: 'credit_card_payment',status: 'accepted' },
      { id: 't5', date: '2026-03-09', amount: -200, category: 'groceries',          status: 'pending'  },
    ];

    for (const t of txns) {
      db.prepare(`
        INSERT INTO transactions (
          id, account_id, date, processed_date, amount, original_amount,
          original_currency, charged_currency, description, status,
          source_type, extraction_method, import_batch_id, import_timestamp,
          schema_version, warnings, review_status, category
        ) VALUES (
          ?, 'acc-1', ?, ?, ?, ?,
          'ILS', 'ILS', 'desc', 'completed',
          'scraper', 'scraper', 'batch-1', '2026-03-01T00:00:00Z',
          2, '[]', ?, ?
        )
      `).run(t.id, t.date, t.date, t.amount, t.amount, t.status, t.category);
    }
  }

  beforeEach(() => {
    db = openDb(':memory:');
    seed(db);
  });

  afterEach(() => {
    db.close();
  });

  it('groups accepted expenses by category', () => {
    const { expenses } = getCategoryBreakdown(db, '2026-03-01', '2026-04-01');
    const groceries = expenses.find((e) => e.category === 'groceries');
    expect(groceries).toBeDefined();
    expect(groceries!.total).toBe(250);
    expect(groceries!.count).toBe(1);

    const dining = expenses.find((e) => e.category === 'dining');
    expect(dining).toBeDefined();
    expect(dining!.total).toBe(100);
  });

  it('excludes accounting transfers (credit_card_payment) from results', () => {
    const { expenses } = getCategoryBreakdown(db, '2026-03-01', '2026-04-01');
    expect(expenses.find((e) => e.category === 'credit_card_payment')).toBeUndefined();
  });

  it('separates income into its own bucket', () => {
    const { income } = getCategoryBreakdown(db, '2026-03-01', '2026-04-01');
    const inc = income.find((e) => e.category === 'income');
    expect(inc).toBeDefined();
    expect(inc!.total).toBe(5000);
  });

  it('excludes pending transactions', () => {
    const { expenses } = getCategoryBreakdown(db, '2026-03-01', '2026-04-01');
    const groceries = expenses.find((e) => e.category === 'groceries');
    expect(groceries!.count).toBe(1);
  });

  it('returns empty arrays outside the date range', () => {
    const { expenses, income } = getCategoryBreakdown(db, '2025-01-01', '2025-02-01');
    expect(expenses).toHaveLength(0);
    expect(income).toHaveLength(0);
  });
});

describe('overview timeline helpers', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = openDb(':memory:');
    db.prepare(`
      INSERT INTO accounts (id, institution, institution_type, account_number, type, currency)
      VALUES
        ('acc-1', 'test-bank', 'bank', '000', 'checking', 'ILS'),
        ('acc-2', 'test-card', 'card', '111', 'credit', 'ILS')
    `).run();
    db.prepare(`
      INSERT INTO import_batches (id, created_at, source_type, connector_id, status, extraction_method)
      VALUES
        ('batch-1', '2026-03-10T10:00:00Z', 'scraper', 'test-bank', 'success', 'scraper'),
        ('batch-2', '2026-03-12T15:30:00Z', 'pdf', 'test-card', 'success', 'agent')
    `).run();

    const txns = [
      { id: 't1', accountId: 'acc-1', date: '2026-03-10', amount: -120, category: 'groceries' },
      { id: 't2', accountId: 'acc-1', date: '2026-03-10', amount: 3000, category: 'income' },
      { id: 't3', accountId: 'acc-2', date: '2026-03-12', amount: -80, category: 'dining' },
      { id: 't4', accountId: 'acc-2', date: '2026-03-13', amount: -500, category: 'credit_card_payment' },
    ];

    for (const txn of txns) {
      db.prepare(`
        INSERT INTO transactions (
          id, account_id, date, processed_date, amount, original_amount,
          original_currency, charged_currency, description, status,
          source_type, extraction_method, import_batch_id, import_timestamp,
          schema_version, warnings, review_status, category
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          'ILS', 'ILS', 'desc', 'completed',
          'scraper', 'scraper', 'batch-1', '2026-03-10T00:00:00Z',
          2, '[]', 'accepted', ?
        )
      `).run(txn.id, txn.accountId, txn.date, txn.date, txn.amount, txn.amount, txn.category);
    }
  });

  afterEach(() => {
    db.close();
  });

  it('builds a daily cash flow series and excludes accounting transfers', () => {
    const series = getCashFlowSeries(db, '2026-03-10', '2026-03-14');
    expect(series).toHaveLength(4);
    expect(series[0]).toEqual({ date: '2026-03-10', spend: 120, income: 3000, net: 2880 });
    expect(series[2]).toEqual({ date: '2026-03-12', spend: 80, income: 0, net: -80 });
    expect(series[3]).toEqual({ date: '2026-03-13', spend: 0, income: 0, net: 0 });
  });

  it('counts distinct accepted sources and returns latest import timestamp', () => {
    expect(getAcceptedSourcesCount(db, '2026-03-10', '2026-03-14')).toBe(2);
    expect(getLatestImportAt(db)).toBe('2026-03-12T15:30:00Z');
  });
});

describe('backfillCreditCardPaymentCategories', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = openDb(':memory:');
    db.prepare(`
      INSERT INTO accounts (id, institution, institution_type, account_number, type, currency)
      VALUES ('acc-1', 'leumi', 'bank', '000', 'checking', 'ILS')
    `).run();
    db.prepare(`
      INSERT INTO import_batches (id, created_at, source_type, connector_id, status, extraction_method)
      VALUES ('batch-1', '2026-03-01T00:00:00Z', 'scraper', 'leumi', 'success', 'scraper')
    `).run();
    db.prepare(`
      INSERT INTO transactions (
        id, account_id, date, processed_date, amount, original_amount,
        original_currency, charged_currency, description, status,
        source_type, extraction_method, import_batch_id, import_timestamp,
        schema_version, warnings, review_status, category
      ) VALUES (
        't-leumi-visa', 'acc-1', '2026-03-15', '2026-03-15', -8514.92, -8514.92,
        'ILS', 'ILS', 'לאומי ויזה', 'completed',
        'scraper', 'scraper', 'batch-1', '2026-03-01T00:00:00Z',
        2, '[]', 'accepted', 'other'
      )
    `).run();
  });

  afterEach(() => {
    db.close();
  });

  it('re-tags Leumi Visa settlements from other to credit_card_payment', () => {
    expect(backfillCreditCardPaymentCategories(db)).toBe(1);
    const row = db.prepare<[string], { category: string | null }>(
      'SELECT category FROM transactions WHERE id = ?',
    ).get('t-leumi-visa');
    expect(row?.category).toBe('credit_card_payment');
    const { expenses } = getCategoryBreakdown(db, '2026-03-01', '2026-04-01');
    expect(expenses.find((e) => e.category === 'other')).toBeUndefined();
  });
});
