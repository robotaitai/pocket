import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../src/main/db/init.js';
import {
  getBatchSummaries,
  getTransactionsForReview,
  setReviewStatus,
  setTransactionCategory,
  undoLastAction,
} from '../src/main/db/review.js';
import type Database from 'better-sqlite3';

function seedBatch(db: Database.Database): { batchId: string; txnId: string } {
  const batchId = 'batch-test-1';
  const txnId = 'txn-test-1';
  const accountId = 'acc-test-1';

  db.prepare(`
    INSERT INTO accounts (id, institution, institution_type, account_number, type, currency)
    VALUES (?, 'hapoalim', 'bank', '000-001', 'bank', 'ILS')
  `).run(accountId);

  db.prepare(`
    INSERT INTO import_batches (id, created_at, source_type, connector_id, status, extraction_method)
    VALUES (?, '2026-01-01T00:00:00Z', 'scraper', 'hapoalim', 'success', 'scraper')
  `).run(batchId);

  db.prepare(`
    INSERT INTO transactions (
      id, account_id, date, processed_date, amount, original_amount,
      original_currency, charged_currency, description, status,
      source_type, extraction_method, import_batch_id, import_timestamp, schema_version, warnings
    ) VALUES (
      ?, ?, '2026-01-05', '2026-01-05', -100, -100,
      'ILS', 'ILS', 'Supermarket', 'completed',
      'scraper', 'scraper', ?, '2026-01-01T00:00:00Z', 2, '[]'
    )
  `).run(txnId, accountId, batchId);

  return { batchId, txnId };
}

describe('review-queue DB layer', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = openDb(':memory:');
  });

  it('getBatchSummaries returns an empty list on fresh DB', () => {
    expect(getBatchSummaries(db)).toEqual([]);
  });

  it('getBatchSummaries returns batch with correct counts', () => {
    const { batchId } = seedBatch(db);
    const summaries = getBatchSummaries(db);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]!.batchId).toBe(batchId);
    expect(summaries[0]!.total).toBe(1);
    expect(summaries[0]!.pending).toBe(1);
    expect(summaries[0]!.accepted).toBe(0);
  });

  it('getTransactionsForReview returns pending transactions', () => {
    const { txnId } = seedBatch(db);
    const txns = getTransactionsForReview(db, { reviewStatus: 'pending' });
    expect(txns).toHaveLength(1);
    expect(txns[0]!.id).toBe(txnId);
    expect(txns[0]!.reviewStatus).toBe('pending');
    expect(txns[0]!.effectiveCategory).toBeNull();
  });

  it('setReviewStatus transitions to accepted', () => {
    const { txnId } = seedBatch(db);
    setReviewStatus(db, [txnId], 'accepted', 'accept');
    const txns = getTransactionsForReview(db, { reviewStatus: 'accepted' });
    expect(txns[0]!.reviewStatus).toBe('accepted');
    expect(txns[0]!.reviewedAt).not.toBeNull();
  });

  it('setReviewStatus transitions to rejected', () => {
    const { txnId } = seedBatch(db);
    setReviewStatus(db, [txnId], 'rejected', 'reject');
    const txns = getTransactionsForReview(db, { reviewStatus: 'rejected' });
    expect(txns[0]!.reviewStatus).toBe('rejected');
  });

  it('batch summary counts update after accept', () => {
    const { txnId, batchId } = seedBatch(db);
    setReviewStatus(db, [txnId], 'accepted', 'accept');
    const [summary] = getBatchSummaries(db);
    expect(summary!.batchId).toBe(batchId);
    expect(summary!.pending).toBe(0);
    expect(summary!.accepted).toBe(1);
  });

  it('setTransactionCategory sets user_category and effectiveCategory', () => {
    const { txnId } = seedBatch(db);
    setTransactionCategory(db, txnId, 'groceries');
    const [txn] = getTransactionsForReview(db);
    expect(txn!.userCategory).toBe('groceries');
    expect(txn!.effectiveCategory).toBe('groceries');
  });

  it('undoLastAction restores previous review_status', () => {
    const { txnId } = seedBatch(db);
    setReviewStatus(db, [txnId], 'accepted', 'accept');
    const result = undoLastAction(db);
    expect(result.restoredCount).toBe(1);
    const [txn] = getTransactionsForReview(db);
    expect(txn!.reviewStatus).toBe('pending');
  });

  it('undoLastAction on empty log returns restoredCount 0', () => {
    const result = undoLastAction(db);
    expect(result.restoredCount).toBe(0);
  });

  it('bulk accept updates all ids and tracks as single undo entry', () => {
    seedBatch(db);
    // add second txn
    const batchId = 'batch-test-1';
    db.prepare(`
      INSERT INTO transactions (
        id, account_id, date, processed_date, amount, original_amount,
        original_currency, charged_currency, description, status,
        source_type, extraction_method, import_batch_id, import_timestamp, schema_version, warnings
      ) VALUES (
        'txn-test-2', 'acc-test-1', '2026-01-06', '2026-01-06', -50, -50,
        'ILS', 'ILS', 'Pharmacy', 'completed',
        'scraper', 'scraper', ?, '2026-01-01T00:00:00Z', 2, '[]'
      )
    `).run(batchId);

    setReviewStatus(db, ['txn-test-1', 'txn-test-2'], 'accepted', 'bulk_accept');

    const accepted = getTransactionsForReview(db, { reviewStatus: 'accepted' });
    expect(accepted).toHaveLength(2);

    const result = undoLastAction(db);
    expect(result.restoredCount).toBe(2);
    expect(result.actionType).toBe('bulk_accept');

    const pending = getTransactionsForReview(db, { reviewStatus: 'pending' });
    expect(pending).toHaveLength(2);
  });

  it('getTransactionsForReview filtered by batchId', () => {
    seedBatch(db);
    const txns = getTransactionsForReview(db, { batchId: 'batch-test-1' });
    expect(txns).toHaveLength(1);
    const none = getTransactionsForReview(db, { batchId: 'nonexistent' });
    expect(none).toHaveLength(0);
  });

  it('possibleDuplicate is false when no accepted match exists in another account', () => {
    seedBatch(db);
    const [txn] = getTransactionsForReview(db, { reviewStatus: 'pending' });
    expect(txn!.possibleDuplicate).toBe(false);
  });

  it('possibleDuplicate is true when an accepted transaction with same date/amount/description exists in another account', () => {
    seedBatch(db);

    // Create a second account and an accepted transaction that matches txn-test-1
    db.prepare(`
      INSERT INTO accounts (id, institution, institution_type, account_number, type, currency)
      VALUES ('acc-other', 'cal', 'card', '111-222', 'credit', 'ILS')
    `).run();
    db.prepare(`
      INSERT INTO import_batches (id, created_at, source_type, connector_id, status, extraction_method)
      VALUES ('batch-other', '2026-01-02T00:00:00Z', 'pdf', 'cal', 'success', 'pdf-parse')
    `).run();
    db.prepare(`
      INSERT INTO transactions (
        id, account_id, date, processed_date, amount, original_amount,
        original_currency, charged_currency, description, status,
        source_type, extraction_method, import_batch_id, import_timestamp, schema_version,
        warnings, review_status
      ) VALUES (
        'txn-dup', 'acc-other', '2026-01-05', '2026-01-05', -100, -100,
        'ILS', 'ILS', 'Supermarket', 'completed',
        'pdf', 'pdf-parse', 'batch-other', '2026-01-02T00:00:00Z', 2,
        '[]', 'accepted'
      )
    `).run();

    const [txn] = getTransactionsForReview(db, { reviewStatus: 'pending' });
    expect(txn!.possibleDuplicate).toBe(true);
  });

  it('possibleDuplicate is false for a match in the same account', () => {
    seedBatch(db);
    // Accept the existing transaction so it has review_status = accepted, same account
    setReviewStatus(db, ['txn-test-1'], 'accepted', 'accept');

    // Add a new pending transaction in the same account with same details
    db.prepare(`
      INSERT INTO import_batches (id, created_at, source_type, connector_id, status, extraction_method)
      VALUES ('batch-test-2', '2026-01-03T00:00:00Z', 'scraper', 'hapoalim', 'success', 'scraper')
    `).run();
    db.prepare(`
      INSERT INTO transactions (
        id, account_id, date, processed_date, amount, original_amount,
        original_currency, charged_currency, description, status,
        source_type, extraction_method, import_batch_id, import_timestamp, schema_version,
        warnings, review_status
      ) VALUES (
        'txn-same-acc', 'acc-test-1', '2026-01-05', '2026-01-05', -100, -100,
        'ILS', 'ILS', 'Supermarket', 'completed',
        'scraper', 'scraper', 'batch-test-2', '2026-01-03T00:00:00Z', 2,
        '[]', 'pending'
      )
    `).run();

    const pending = getTransactionsForReview(db, { reviewStatus: 'pending' });
    const newTxn = pending.find((t) => t.id === 'txn-same-acc');
    expect(newTxn!.possibleDuplicate).toBe(false);
  });
});
