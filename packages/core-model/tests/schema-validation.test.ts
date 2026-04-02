import { describe, it, expect } from 'vitest';
import { validateRawRecord } from '../src/index.js';
import type { RawImportRecord } from '../src/raw-import.js';

const VALID: RawImportRecord = {
  sourceType: 'scraper',
  extractionMethod: 'scraper',
  accountId: 'acc-0001',
  date: '2026-03-01T00:00:00.000Z',
  amount: -250,
  originalAmount: -250,
  originalCurrency: 'ILS',
  description: 'Supermarket',
  warnings: [],
};

describe('validateRawRecord — field-level schema validation', () => {
  it('accepts a fully valid record', () => {
    expect(validateRawRecord(VALID)).toHaveLength(0);
  });

  it('rejects empty accountId', () => {
    expect(validateRawRecord({ ...VALID, accountId: '' })).not.toHaveLength(0);
  });

  it('rejects empty date', () => {
    expect(validateRawRecord({ ...VALID, date: '' })).not.toHaveLength(0);
  });

  it('rejects NaN amount', () => {
    expect(validateRawRecord({ ...VALID, amount: NaN })).not.toHaveLength(0);
  });

  it('rejects Infinity amount', () => {
    expect(validateRawRecord({ ...VALID, amount: Infinity })).not.toHaveLength(0);
  });

  it('rejects NaN originalAmount', () => {
    expect(validateRawRecord({ ...VALID, originalAmount: NaN })).not.toHaveLength(0);
  });

  it('rejects blank description', () => {
    expect(validateRawRecord({ ...VALID, description: '' })).not.toHaveLength(0);
  });

  it('rejects whitespace-only description', () => {
    expect(validateRawRecord({ ...VALID, description: '   ' })).not.toHaveLength(0);
  });

  it('rejects missing originalCurrency', () => {
    expect(validateRawRecord({ ...VALID, originalCurrency: '' })).not.toHaveLength(0);
  });

  it('rejects confidenceScore > 1', () => {
    expect(validateRawRecord({ ...VALID, confidenceScore: 1.5 })).not.toHaveLength(0);
  });

  it('rejects confidenceScore < 0', () => {
    expect(validateRawRecord({ ...VALID, confidenceScore: -0.1 })).not.toHaveLength(0);
  });

  it('accepts confidenceScore = 0', () => {
    expect(validateRawRecord({ ...VALID, confidenceScore: 0 })).toHaveLength(0);
  });

  it('accepts confidenceScore = 1', () => {
    expect(validateRawRecord({ ...VALID, confidenceScore: 1 })).toHaveLength(0);
  });
});

describe('validateRawRecord — malformed extraction payloads', () => {
  it('flags multiple errors for multiple bad fields at once', () => {
    const malformed: RawImportRecord = {
      ...VALID,
      accountId: '',
      description: '',
      amount: NaN,
    };
    const errors = validateRawRecord(malformed);
    expect(errors.length).toBeGreaterThanOrEqual(3);
    const fields = errors.map((e) => e.field);
    expect(fields).toContain('accountId');
    expect(fields).toContain('description');
    expect(fields).toContain('amount');
  });

  it('a completely empty record produces multiple validation errors', () => {
    const empty = {} as RawImportRecord;
    const errors = validateRawRecord(empty);
    expect(errors.length).toBeGreaterThan(4);
  });
});
