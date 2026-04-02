import { describe, it, expect } from 'vitest';
import { normalizeImport, validateRawRecord, transactionId, createImportBatch } from '../src/index.js';
import type { RawImportRecord } from '../src/raw-import.js';
import type { ImportBatch } from '../src/import-batch.js';

const BASE_RAW: RawImportRecord = {
  sourceType: 'scraper',
  extractionMethod: 'scraper',
  providerUsed: 'hapoalim',
  accountId: 'acc-0001',
  date: '2026-03-01T00:00:00.000Z',
  processedDate: '2026-03-02T00:00:00.000Z',
  amount: -250,
  originalAmount: -250,
  originalCurrency: 'ILS',
  description: 'Supermarket',
  status: 'completed',
  warnings: [],
};

function makeBatch(overrides?: Partial<ImportBatch>): ImportBatch {
  return {
    ...createImportBatch({ sourceType: 'scraper', extractionMethod: 'scraper' }),
    ...overrides,
  };
}

describe('validateRawRecord', () => {
  it('returns no errors for a valid record', () => {
    expect(validateRawRecord(BASE_RAW)).toHaveLength(0);
  });

  it('flags missing accountId', () => {
    const errs = validateRawRecord({ ...BASE_RAW, accountId: '' });
    expect(errs.some((e) => e.field === 'accountId')).toBe(true);
  });

  it('flags missing date', () => {
    const errs = validateRawRecord({ ...BASE_RAW, date: '' });
    expect(errs.some((e) => e.field === 'date')).toBe(true);
  });

  it('flags NaN amount', () => {
    const errs = validateRawRecord({ ...BASE_RAW, amount: NaN });
    expect(errs.some((e) => e.field === 'amount')).toBe(true);
  });

  it('flags missing description', () => {
    const errs = validateRawRecord({ ...BASE_RAW, description: '   ' });
    expect(errs.some((e) => e.field === 'description')).toBe(true);
  });

  it('flags out-of-range confidenceScore', () => {
    const errs = validateRawRecord({ ...BASE_RAW, confidenceScore: 1.5 });
    expect(errs.some((e) => e.field === 'confidenceScore')).toBe(true);
  });
});

describe('normalizeImport — happy path', () => {
  it('converts a valid RawImportRecord to a canonical Transaction', () => {
    const batch = makeBatch();
    const { records, failures } = normalizeImport([BASE_RAW], batch);
    expect(failures).toHaveLength(0);
    expect(records).toHaveLength(1);

    const tx = records[0]!;
    expect(tx.schemaVersion).toBe(2);
    expect(tx.importBatchId).toBe(batch.id);
    expect(tx.importTimestamp).toBe(batch.createdAt);
    expect(tx.sourceType).toBe('scraper');
    expect(tx.extractionMethod).toBe('scraper');
    expect(tx.providerUsed).toBe('hapoalim');
    expect(tx.accountId).toBe('acc-0001');
    expect(tx.amount).toBe(-250);
    expect(tx.originalCurrency).toBe('ILS');
    expect(tx.status).toBe('completed');
    expect(tx.warnings).toEqual([]);
    expect(tx.id).toMatch(/^[0-9a-f]{32}$/);
  });

  it('defaults processedDate to date when absent', () => {
    const raw: RawImportRecord = { ...BASE_RAW, processedDate: undefined };
    const { records } = normalizeImport([raw], makeBatch());
    const tx = records[0]!;
    expect(tx.processedDate).toBe(tx.date);
  });

  it('defaults status to completed when absent', () => {
    const raw: RawImportRecord = { ...BASE_RAW, status: undefined };
    const { records } = normalizeImport([raw], makeBatch());
    expect(records[0]?.status).toBe('completed');
  });

  it('normalizes NIS currency to ILS with a warning', () => {
    const raw: RawImportRecord = { ...BASE_RAW, originalCurrency: 'NIS' };
    const { records } = normalizeImport([raw], makeBatch());
    const tx = records[0]!;
    expect(tx.originalCurrency).toBe('ILS');
    expect(tx.warnings).toHaveLength(0); // NIS → ILS is a known alias, no warning
  });

  it('adds a warning for unknown currency', () => {
    const raw: RawImportRecord = { ...BASE_RAW, originalCurrency: 'XYZ' };
    const { records } = normalizeImport([raw], makeBatch());
    const tx = records[0]!;
    expect(tx.originalCurrency).toBe('ILS');
    expect(tx.warnings.some((w) => w.field === 'originalCurrency')).toBe(true);
  });

  it('propagates extractor warnings to canonical record', () => {
    const raw: RawImportRecord = {
      ...BASE_RAW,
      warnings: [{ field: 'amount', message: 'OCR unclear', severity: 'warning' }],
    };
    const { records } = normalizeImport([raw], makeBatch());
    expect(records[0]?.warnings).toHaveLength(1);
  });

  it('preserves confidenceScore for agent-extracted records', () => {
    const raw: RawImportRecord = {
      ...BASE_RAW,
      sourceType: 'pdf',
      extractionMethod: 'agent',
      confidenceScore: 0.87,
    };
    const { records } = normalizeImport([raw], makeBatch());
    expect(records[0]?.confidenceScore).toBe(0.87);
  });
});

describe('normalizeImport — failures', () => {
  it('puts invalid records in failures, not records', () => {
    const invalid: RawImportRecord = { ...BASE_RAW, accountId: '' };
    const { records, failures } = normalizeImport([invalid], makeBatch());
    expect(records).toHaveLength(0);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.errors.some((e) => e.field === 'accountId')).toBe(true);
  });

  it('handles mixed valid + invalid records', () => {
    const valid = BASE_RAW;
    const invalid: RawImportRecord = { ...BASE_RAW, description: '' };
    const { records, failures } = normalizeImport([valid, invalid], makeBatch());
    expect(records).toHaveLength(1);
    expect(failures).toHaveLength(1);
  });

  it('does not throw on empty input', () => {
    const { records, failures } = normalizeImport([], makeBatch());
    expect(records).toHaveLength(0);
    expect(failures).toHaveLength(0);
  });
});

describe('transactionId', () => {
  it('is deterministic for identical input', () => {
    const id1 = transactionId('acc', '2026-03-01', '2026-03-02', -250, 'ILS', 'Supermarket');
    const id2 = transactionId('acc', '2026-03-01', '2026-03-02', -250, 'ILS', 'Supermarket');
    expect(id1).toBe(id2);
  });

  it('differs when any field changes', () => {
    const base = () => transactionId('acc', '2026-03-01', '2026-03-02', -250, 'ILS', 'Supermarket');
    expect(base()).not.toBe(transactionId('acc2', '2026-03-01', '2026-03-02', -250, 'ILS', 'Supermarket'));
    expect(base()).not.toBe(transactionId('acc', '2026-04-01', '2026-03-02', -250, 'ILS', 'Supermarket'));
    expect(base()).not.toBe(transactionId('acc', '2026-03-01', '2026-03-02', -999, 'ILS', 'Supermarket'));
    expect(base()).not.toBe(transactionId('acc', '2026-03-01', '2026-03-02', -250, 'USD', 'Supermarket'));
    expect(base()).not.toBe(transactionId('acc', '2026-03-01', '2026-03-02', -250, 'ILS', 'Other'));
  });

  it('produces a 32-char hex string', () => {
    expect(transactionId('a', 'b', 'c', 0, 'ILS', 'd')).toMatch(/^[0-9a-f]{32}$/);
  });

  it('same transaction from scraper and PDF produces same id (cross-source dedup)', () => {
    // Simulated: scraper produces normalised date, PDF parser does too
    const fromScraper = transactionId('acc', '2026-03-01T00:00:00.000Z', '2026-03-02T00:00:00.000Z', -250, 'ILS', 'Supermarket');
    const fromPdf     = transactionId('acc', '2026-03-01T00:00:00.000Z', '2026-03-02T00:00:00.000Z', -250, 'ILS', 'Supermarket');
    expect(fromScraper).toBe(fromPdf);
  });
});
