import { describe, it, expect } from 'vitest';
import {
  deduplicateById,
  findPotentialDuplicates,
  normalizeImport,
  createImportBatch,
} from '../src/index.js';
import type { Transaction } from '../src/index.js';
import type { RawImportRecord } from '../src/raw-import.js';

function makeRaw(overrides?: Partial<RawImportRecord>): RawImportRecord {
  return {
    sourceType: 'scraper',
    extractionMethod: 'scraper',
    accountId: 'acc-0001',
    date: '2026-03-01T00:00:00.000Z',
    processedDate: '2026-03-02T00:00:00.000Z',
    amount: -250,
    originalAmount: -250,
    originalCurrency: 'ILS',
    description: 'Supermarket',
    status: 'completed',
    warnings: [],
    ...overrides,
  };
}

function makeCanonical(overrides?: Partial<RawImportRecord>): Transaction {
  const batch = createImportBatch({ sourceType: 'scraper', extractionMethod: 'scraper' });
  const { records } = normalizeImport([makeRaw(overrides)], batch);
  return records[0]!;
}

describe('deduplicateById', () => {
  it('identifies new records when existingIds is empty', () => {
    const tx = makeCanonical();
    const { newRecords, exactDuplicates } = deduplicateById([tx], new Set());
    expect(newRecords).toHaveLength(1);
    expect(exactDuplicates).toHaveLength(0);
  });

  it('identifies exact duplicates by id', () => {
    const tx = makeCanonical();
    const { newRecords, exactDuplicates } = deduplicateById([tx], new Set([tx.id]));
    expect(newRecords).toHaveLength(0);
    expect(exactDuplicates).toHaveLength(1);
  });

  it('detects cross-source duplicates: same id from scraper and PDF', () => {
    // The same real transaction normalised from two different sources
    // should produce the same deterministic id
    const fromScraper = makeCanonical({ sourceType: 'scraper', extractionMethod: 'scraper' });
    const fromPdf = makeCanonical({ sourceType: 'pdf', extractionMethod: 'agent' });
    // Same financial data → same id
    expect(fromScraper.id).toBe(fromPdf.id);

    const existing = new Set([fromScraper.id]);
    const { exactDuplicates } = deduplicateById([fromPdf], existing);
    expect(exactDuplicates).toHaveLength(1);
  });

  it('flags potential duplicates by accountId + date + amount', () => {
    // Same transaction, but description differs slightly (e.g. truncated by bank)
    const tx1 = makeCanonical({ description: 'Supermarket' });
    const tx2 = makeCanonical({ description: 'Supermarket Ltd' }); // different id, same key fields

    expect(tx1.id).not.toBe(tx2.id); // different id because description differs

    const { potentialDuplicates } = deduplicateById([tx2], new Set([tx1.id]), [tx1]);
    expect(potentialDuplicates).toHaveLength(1);
    expect(potentialDuplicates[0]?.conflictingId).toBe(tx1.id);
  });

  it('does not flag potential duplicates when amount differs', () => {
    const tx1 = makeCanonical({ amount: -250 });
    const tx2 = makeCanonical({ amount: -100, originalAmount: -100, description: 'Other' });
    const { potentialDuplicates } = deduplicateById([tx2], new Set([tx1.id]), [tx1]);
    expect(potentialDuplicates).toHaveLength(0);
  });
});

describe('findPotentialDuplicates', () => {
  it('returns empty for unique records', () => {
    const t1 = makeCanonical({ amount: -100, originalAmount: -100, description: 'A' });
    const t2 = makeCanonical({ amount: -200, originalAmount: -200, description: 'B' });
    expect(findPotentialDuplicates([t1, t2])).toHaveLength(0);
  });

  it('detects intra-batch duplicates with same date+amount+account', () => {
    const t1 = makeCanonical({ description: 'Supermarket' });
    const t2 = makeCanonical({ description: 'Supermarket Ltd' }); // same key fields, different id
    const dupes = findPotentialDuplicates([t1, t2]);
    expect(dupes.length).toBeGreaterThan(0);
  });

  it('does not flag records with different amounts as duplicates', () => {
    const t1 = makeCanonical({ amount: -100, originalAmount: -100 });
    const t2 = makeCanonical({ amount: -200, originalAmount: -200, description: 'X' });
    expect(findPotentialDuplicates([t1, t2])).toHaveLength(0);
  });
});
