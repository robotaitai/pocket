import { describe, it, expect } from 'vitest';
import { summarizePeriod, comparePeriods } from '../src/aggregations.js';
import type { Transaction } from '@pocket/core-model';
import type { DateRange } from '../src/types.js';

function makeTxn(overrides: Partial<Transaction> & Pick<Transaction, 'id' | 'amount' | 'date'>): Transaction {
  return {
    accountId: 'acc-1',
    processedDate: overrides.date,
    originalAmount: overrides.amount,
    originalCurrency: 'ILS',
    chargedCurrency: 'ILS',
    description: 'Test',
    status: 'completed',
    sourceType: 'scraper',
    importBatchId: 'batch-1',
    importTimestamp: '2026-01-01T00:00:00Z',
    extractionMethod: 'scraper',
    warnings: [],
    schemaVersion: 2,
    ...overrides,
  } as Transaction;
}

const MARCH: DateRange = { start: '2026-03-01', end: '2026-04-01' };

const txns: Transaction[] = [
  makeTxn({ id: 't1', amount: 5000, date: '2026-03-05' }), // salary
  makeTxn({ id: 't2', amount: -250, date: '2026-03-10' }), // groceries
  makeTxn({ id: 't3', amount: -80, date: '2026-03-15' }),  // pharmacy
  makeTxn({ id: 't4', amount: -1200, date: '2026-03-28' }), // rent
];

describe('summarizePeriod', () => {
  it('computes income, expenses, net correctly', () => {
    const summary = summarizePeriod(txns, MARCH);
    expect(summary.income).toBe(5000);
    expect(summary.expenses).toBe(1530);
    expect(summary.net).toBe(3470);
    expect(summary.transactionCount).toBe(4);
  });

  it('reports no low confidence data when all confidence scores are absent', () => {
    const summary = summarizePeriod(txns, MARCH);
    expect(summary.hasLowConfidenceData).toBe(false);
  });

  it('flags low confidence data when a transaction has confidenceScore < 0.7', () => {
    const withLowConf: Transaction[] = [
      ...txns,
      makeTxn({ id: 't5', amount: -50, date: '2026-03-20', confidenceScore: 0.5 }),
    ];
    const summary = summarizePeriod(withLowConf, MARCH);
    expect(summary.hasLowConfidenceData).toBe(true);
  });

  it('returns zeros for an empty transaction list', () => {
    const summary = summarizePeriod([], MARCH);
    expect(summary.income).toBe(0);
    expect(summary.expenses).toBe(0);
    expect(summary.net).toBe(0);
    expect(summary.transactionCount).toBe(0);
  });

  it('preserves the passed period in the result', () => {
    const summary = summarizePeriod(txns, MARCH);
    expect(summary.period).toEqual(MARCH);
  });
});

describe('comparePeriods', () => {
  const current = summarizePeriod(txns, MARCH);
  const previousTxns: Transaction[] = [
    makeTxn({ id: 'p1', amount: 4000, date: '2026-02-05' }),
    makeTxn({ id: 'p2', amount: -400, date: '2026-02-10' }),
  ];
  const previous = summarizePeriod(previousTxns, { start: '2026-02-01', end: '2026-03-01' });

  it('computes expense change correctly', () => {
    const cmp = comparePeriods(current, previous);
    // expenses: from 400 to 1530 → +282.5%
    expect(cmp.expenseChange).toBeCloseTo(282.5, 0);
  });

  it('returns null for income change when previous income is 0', () => {
    const noIncomePrev = summarizePeriod(
      [makeTxn({ id: 'x1', amount: -100, date: '2026-02-05' })],
      { start: '2026-02-01', end: '2026-03-01' },
    );
    const cmp = comparePeriods(current, noIncomePrev);
    expect(cmp.incomeChange).toBeNull();
  });
});
