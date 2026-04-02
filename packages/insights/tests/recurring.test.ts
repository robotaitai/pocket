import { describe, it, expect } from 'vitest';
import { detectRecurring } from '../src/recurring.js';
import type { Transaction } from '@pocket/core-model';

function makeTxn(id: string, amount: number, date: string, description = 'Netflix'): Transaction {
  return {
    id,
    accountId: 'acc-1',
    date,
    processedDate: date,
    amount,
    originalAmount: amount,
    originalCurrency: 'ILS',
    chargedCurrency: 'ILS',
    description,
    status: 'completed',
    sourceType: 'scraper',
    importBatchId: 'batch-1',
    importTimestamp: '2026-01-01T00:00:00Z',
    extractionMethod: 'scraper',
    warnings: [],
    schemaVersion: 2,
  } as Transaction;
}

describe('detectRecurring', () => {
  it('returns empty for fewer than 2 occurrences', () => {
    const txns = [makeTxn('t1', -50, '2026-01-01')];
    expect(detectRecurring(txns)).toHaveLength(0);
  });

  it('detects a monthly recurring payment', () => {
    const txns = [
      makeTxn('t1', -50, '2026-01-01'),
      makeTxn('t2', -50, '2026-02-01'),
      makeTxn('t3', -50, '2026-03-01'),
    ];
    const recurring = detectRecurring(txns);
    expect(recurring).toHaveLength(1);
    expect(recurring[0]!.period).toBe('monthly');
    expect(recurring[0]!.occurrenceCount).toBe(3);
    expect(recurring[0]!.estimatedAmount).toBe(50);
  });

  it('detects weekly recurring payment', () => {
    const txns = [
      makeTxn('t1', -30, '2026-01-05', 'Coffee shop'),
      makeTxn('t2', -30, '2026-01-12', 'Coffee shop'),
      makeTxn('t3', -35, '2026-01-19', 'Coffee shop'),
    ];
    const recurring = detectRecurring(txns);
    expect(recurring).toHaveLength(1);
    expect(recurring[0]!.period).toBe('weekly');
  });

  it('does not include income (positive amount) in recurring', () => {
    const txns = [
      makeTxn('t1', 5000, '2026-01-01', 'Salary'),
      makeTxn('t2', 5000, '2026-02-01', 'Salary'),
      makeTxn('t3', 5000, '2026-03-01', 'Salary'),
    ];
    expect(detectRecurring(txns)).toHaveLength(0);
  });

  it('computes nextExpectedDate approximately', () => {
    const txns = [
      makeTxn('t1', -100, '2026-01-01'),
      makeTxn('t2', -100, '2026-02-01'),
      makeTxn('t3', -100, '2026-03-01'),
    ];
    const [rec] = detectRecurring(txns);
    expect(rec!.nextExpectedDate).toBeTruthy();
    // Should be approximately one month after the last date (2026-03-01)
    expect(new Date(rec!.nextExpectedDate!).getTime()).toBeGreaterThan(new Date('2026-03-01').getTime());
  });

  it('reports high confidence for perfectly regular intervals', () => {
    const txns = [
      makeTxn('t1', -99, '2026-01-01'),
      makeTxn('t2', -99, '2026-02-01'),
      makeTxn('t3', -99, '2026-03-01'),
    ];
    const [rec] = detectRecurring(txns);
    expect(rec!.confidence).toBeGreaterThan(0.8);
  });

  it('reports lower confidence for irregular intervals', () => {
    const txns = [
      makeTxn('t1', -50, '2026-01-01'),
      makeTxn('t2', -50, '2026-01-20'), // only 19 days
      makeTxn('t3', -50, '2026-03-01'), // 40 days
    ];
    const [rec] = detectRecurring(txns);
    expect(rec!.confidence).toBeLessThan(0.7);
  });

  it('groups by normalized description (case-insensitive)', () => {
    const txns = [
      makeTxn('t1', -50, '2026-01-01', 'Netflix'),
      makeTxn('t2', -50, '2026-02-01', 'netflix'),
      makeTxn('t3', -50, '2026-03-01', 'NETFLIX'),
    ];
    expect(detectRecurring(txns)).toHaveLength(1);
  });
});
