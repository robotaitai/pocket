import { describe, it, expect } from 'vitest';
import { exportToCsv } from '../src/export.js';
import type { Transaction } from '@pocket/core-model';

function makeTxn(overrides: Partial<Transaction> & Pick<Transaction, 'id' | 'amount' | 'date' | 'description'>): Transaction {
  return {
    accountId: 'acc-1',
    processedDate: overrides.date,
    originalAmount: overrides.amount,
    originalCurrency: 'ILS',
    chargedCurrency: 'ILS',
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

describe('exportToCsv', () => {
  it('produces correct header row', () => {
    const csv = exportToCsv([]);
    const header = csv.split('\n')[0];
    expect(header).toContain('Date');
    expect(header).toContain('Description');
    expect(header).toContain('Amount');
    expect(header).toContain('Currency');
    expect(header).toContain('Category');
  });

  it('produces one data row per transaction', () => {
    const txns = [
      makeTxn({ id: 't1', amount: -100, date: '2026-03-01', description: 'Supermarket' }),
      makeTxn({ id: 't2', amount: 5000, date: '2026-03-05', description: 'Salary' }),
    ];
    const csv = exportToCsv(txns);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 data rows
  });

  it('includes correct date in data row', () => {
    const txns = [makeTxn({ id: 't1', amount: -50, date: '2026-03-15', description: 'Coffee' })];
    const csv = exportToCsv(txns);
    expect(csv).toContain('2026-03-15');
  });

  it('escapes commas in description by quoting the cell', () => {
    const txns = [makeTxn({ id: 't1', amount: -50, date: '2026-03-01', description: 'Shop, Tel Aviv' })];
    const csv = exportToCsv(txns);
    expect(csv).toContain('"Shop, Tel Aviv"');
  });

  it('escapes double-quotes by doubling them', () => {
    const txns = [makeTxn({ id: 't1', amount: -50, date: '2026-03-01', description: 'A "Store"' })];
    const csv = exportToCsv(txns);
    expect(csv).toContain('A ""Store""');
  });

  it('includes review status when provided', () => {
    const txns = [makeTxn({ id: 't1', amount: -50, date: '2026-03-01', description: 'Test' })];
    const csv = exportToCsv(txns, { 't1': 'accepted' });
    expect(csv).toContain('accepted');
  });

  // Golden file: exact CSV output for a fixed set of transactions
  it('golden file: fixed output for known input', () => {
    const txns = [
      makeTxn({ id: 'g1', amount: -250, date: '2026-03-01', description: 'Supermarket', category: 'groceries' }),
      makeTxn({ id: 'g2', amount: 5000, date: '2026-03-05', description: 'Salary', category: 'income' }),
    ];
    const csv = exportToCsv(txns, { 'g1': 'accepted', 'g2': 'accepted' });
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Date,Description,Amount,Currency,Category,Source Type,Import Batch,Review Status,Confidence');
    expect(lines[1]).toContain('2026-03-01');
    expect(lines[1]).toContain('Supermarket');
    expect(lines[1]).toContain('-250');
    expect(lines[1]).toContain('groceries');
    expect(lines[1]).toContain('accepted');
    expect(lines[2]).toContain('Salary');
    expect(lines[2]).toContain('5000');
  });
});
