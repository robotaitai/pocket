import { describe, it, expect } from 'vitest';
import { buildMerchantSummaries, findNewAndSuspiciousMerchants } from '../src/merchants.js';
import type { Transaction } from '@pocket/core-model';

function makeTxn(id: string, amount: number, date: string, description: string, category?: string): Transaction {
  return {
    id, accountId: 'acc-1', date, processedDate: date, amount, originalAmount: amount,
    originalCurrency: 'ILS', chargedCurrency: 'ILS', description, status: 'completed',
    sourceType: 'scraper', importBatchId: 'b1', importTimestamp: '2026-01-01T00:00:00Z',
    extractionMethod: 'scraper', warnings: [], schemaVersion: 2, category,
  } as Transaction;
}

const REF_DATE = '2026-04-02';

describe('buildMerchantSummaries', () => {
  it('excludes income transactions (positive amounts)', () => {
    const txns = [
      makeTxn('t1', 5000, '2026-03-01', 'Salary'),
      makeTxn('t2', -250, '2026-03-10', 'Supermarket'),
    ];
    const summaries = buildMerchantSummaries(txns, REF_DATE);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]!.description).toBe('Supermarket');
  });

  it('computes total and avg correctly for multi-transaction merchant', () => {
    const txns = [
      makeTxn('t1', -100, '2026-03-01', 'Coffee shop'),
      makeTxn('t2', -120, '2026-03-15', 'Coffee shop'),
    ];
    const [m] = buildMerchantSummaries(txns, REF_DATE);
    expect(m!.total).toBe(-220);
    expect(m!.avgAmount).toBe(-110);
    expect(m!.transactionCount).toBe(2);
  });

  it('sorts by total ascending (most spent first)', () => {
    const txns = [
      makeTxn('t1', -50, '2026-03-01', 'Coffee'),
      makeTxn('t2', -1000, '2026-03-01', 'Rent'),
    ];
    const summaries = buildMerchantSummaries(txns, REF_DATE);
    expect(summaries[0]!.description).toBe('Rent');
  });

  it('marks merchant as new if all transactions are within 30 days of refDate', () => {
    const txns = [makeTxn('t1', -100, '2026-03-20', 'New Gym')];
    const [m] = buildMerchantSummaries(txns, REF_DATE);
    expect(m!.isNew).toBe(true);
  });

  it('marks merchant as not new if it has an old transaction', () => {
    const txns = [
      makeTxn('t1', -100, '2025-06-01', 'Old Gym'),
      makeTxn('t2', -100, '2026-03-20', 'Old Gym'),
    ];
    const [m] = buildMerchantSummaries(txns, REF_DATE);
    expect(m!.isNew).toBe(false);
  });

  it('marks merchant as suspicious if untagged and high amount', () => {
    const txns = [makeTxn('t1', -500, '2026-03-15', 'Unknown Corp', undefined)];
    const [m] = buildMerchantSummaries(txns, REF_DATE);
    expect(m!.isSuspicious).toBe(true);
  });

  it('does not mark merchant as suspicious if it has a category', () => {
    const txns = [makeTxn('t1', -500, '2026-03-15', 'Known Corp', 'utilities')];
    const [m] = buildMerchantSummaries(txns, REF_DATE);
    expect(m!.isSuspicious).toBe(false);
  });
});

describe('findNewAndSuspiciousMerchants', () => {
  it('returns only new or suspicious merchants', () => {
    const txns = [
      makeTxn('t1', -50, '2026-03-01', 'Coffee', 'dining'),       // normal, old
      makeTxn('t2', -400, '2026-03-30', 'Mystery Corp', undefined), // suspicious + new
    ];
    const result = findNewAndSuspiciousMerchants(txns, REF_DATE);
    expect(result).toHaveLength(1);
    expect(result[0]!.description).toBe('Mystery Corp');
  });
});
