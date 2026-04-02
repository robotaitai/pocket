import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../src/main/db/init.js';
import {
  suggestCategory,
  recordMerchantRule,
  getAllMerchantRules,
  deleteMerchantRule,
  applyMerchantRulesToBatch,
} from '../src/main/db/merchant-rules.js';
import type Database from 'better-sqlite3';

describe('merchant-rules DB layer', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = openDb(':memory:');
  });

  it('suggestCategory returns null when no rules exist', () => {
    expect(suggestCategory(db, 'Supermarket')).toBeNull();
  });

  it('recordMerchantRule creates a rule and suggestCategory returns it', () => {
    recordMerchantRule(db, 'Supermarket', 'groceries');
    expect(suggestCategory(db, 'Supermarket')).toBe('groceries');
  });

  it('pattern matching is case-insensitive', () => {
    recordMerchantRule(db, 'SUPERMARKET', 'groceries');
    expect(suggestCategory(db, 'supermarket')).toBe('groceries');
    expect(suggestCategory(db, 'Supermarket')).toBe('groceries');
  });

  it('pattern matching normalizes extra whitespace', () => {
    recordMerchantRule(db, 'Coffee  Shop', 'dining');
    expect(suggestCategory(db, 'coffee shop')).toBe('dining');
  });

  it('recordMerchantRule updates category and increments match_count on repeat', () => {
    recordMerchantRule(db, 'Pharmacy', 'health');
    recordMerchantRule(db, 'Pharmacy', 'health');

    const rules = getAllMerchantRules(db);
    expect(rules).toHaveLength(1);
    expect(rules[0]!.matchCount).toBe(2);
  });

  it('recordMerchantRule updates category when user changes mind', () => {
    recordMerchantRule(db, 'Book Store', 'shopping');
    recordMerchantRule(db, 'Book Store', 'education');
    expect(suggestCategory(db, 'Book Store')).toBe('education');
  });

  it('getAllMerchantRules returns rules ordered by match_count desc', () => {
    recordMerchantRule(db, 'Pharmacy', 'health');
    recordMerchantRule(db, 'Pharmacy', 'health');
    recordMerchantRule(db, 'Coffee', 'dining');

    const rules = getAllMerchantRules(db);
    expect(rules[0]!.pattern).toBe('pharmacy');
    expect(rules[0]!.matchCount).toBe(2);
    expect(rules[1]!.pattern).toBe('coffee');
  });

  it('deleteMerchantRule removes a rule', () => {
    recordMerchantRule(db, 'Gas Station', 'transport');
    const [rule] = getAllMerchantRules(db);
    deleteMerchantRule(db, rule!.id);
    expect(getAllMerchantRules(db)).toHaveLength(0);
    expect(suggestCategory(db, 'Gas Station')).toBeNull();
  });
});

describe('applyMerchantRulesToBatch', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = openDb(':memory:');
    db.prepare(`
      INSERT INTO accounts (id, institution, institution_type, account_number, type, currency)
      VALUES ('acc-1', 'test', 'bank', '000', 'checking', 'ILS')
    `).run();
    db.prepare(`
      INSERT INTO import_batches (id, created_at, source_type, connector_id, status, extraction_method)
      VALUES ('batch-1', '2026-01-01T00:00:00Z', 'scraper', 'test', 'success', 'scraper')
    `).run();
  });

  function insertTxn(id: string, description: string, category: string | null = null) {
    db.prepare(`
      INSERT INTO transactions (
        id, account_id, date, processed_date, amount, original_amount,
        original_currency, charged_currency, description, status,
        source_type, extraction_method, import_batch_id, import_timestamp, schema_version,
        warnings, review_status, category
      ) VALUES (
        ?, 'acc-1', '2026-01-10', '2026-01-10', -100, -100,
        'ILS', 'ILS', ?, 'completed',
        'scraper', 'scraper', 'batch-1', '2026-01-01T00:00:00Z', 2,
        '[]', 'pending', ?
      )
    `).run(id, description, category);
  }

  it('tags pending transactions whose description matches a rule', () => {
    insertTxn('txn-1', 'Supermarket');
    recordMerchantRule(db, 'Supermarket', 'groceries');

    const tagged = applyMerchantRulesToBatch(db, 'batch-1');
    expect(tagged).toBe(1);

    const row = db.prepare<[string], { category: string }>('SELECT category FROM transactions WHERE id = ?').get('txn-1');
    expect(row!.category).toBe('groceries');
  });

  it('does not overwrite a category that is already set', () => {
    insertTxn('txn-2', 'Pharmacy', 'health');
    recordMerchantRule(db, 'Pharmacy', 'shopping');

    const tagged = applyMerchantRulesToBatch(db, 'batch-1');
    expect(tagged).toBe(0);

    const row = db.prepare<[string], { category: string }>('SELECT category FROM transactions WHERE id = ?').get('txn-2');
    expect(row!.category).toBe('health');
  });

  it('does not affect transactions in other batches', () => {
    db.prepare(`
      INSERT INTO import_batches (id, created_at, source_type, connector_id, status, extraction_method)
      VALUES ('batch-2', '2026-01-01T00:00:00Z', 'scraper', 'test', 'success', 'scraper')
    `).run();
    db.prepare(`
      INSERT INTO transactions (
        id, account_id, date, processed_date, amount, original_amount,
        original_currency, charged_currency, description, status,
        source_type, extraction_method, import_batch_id, import_timestamp, schema_version,
        warnings, review_status, category
      ) VALUES (
        'txn-other', 'acc-1', '2026-01-10', '2026-01-10', -100, -100,
        'ILS', 'ILS', 'Supermarket', 'completed',
        'scraper', 'scraper', 'batch-2', '2026-01-01T00:00:00Z', 2,
        '[]', 'pending', NULL
      )
    `).run();

    recordMerchantRule(db, 'Supermarket', 'groceries');
    applyMerchantRulesToBatch(db, 'batch-1');

    const row = db.prepare<[string], { category: string | null }>('SELECT category FROM transactions WHERE id = ?').get('txn-other');
    expect(row!.category).toBeNull();
  });

  it('returns 0 when batch has no matching rules', () => {
    insertTxn('txn-3', 'Unknown Merchant');
    const tagged = applyMerchantRulesToBatch(db, 'batch-1');
    expect(tagged).toBe(0);
  });
});
