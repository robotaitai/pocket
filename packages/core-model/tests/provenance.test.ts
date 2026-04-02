import { describe, it, expect } from 'vitest';
import { normalizeImport, createImportBatch } from '../src/index.js';
import type { RawImportRecord } from '../src/raw-import.js';

const BASE: RawImportRecord = {
  sourceType: 'pdf',
  extractionMethod: 'agent',
  providerUsed: 'openai-gpt-4o',
  extractorVersion: '1.0.0',
  sourceFile: 'hapoalim-march-2026.pdf',
  rawReference: 'page:3,row:12',
  accountId: 'acc-0001',
  date: '2026-03-15T00:00:00.000Z',
  amount: -180,
  originalAmount: -180,
  originalCurrency: 'ILS',
  description: 'Coffee shop',
  confidenceScore: 0.92,
  warnings: [{ field: 'date', message: 'Day/month ambiguous', severity: 'warning' }],
};

describe('Provenance preservation', () => {
  it('canonical record preserves all provenance fields from batch and raw record', () => {
    const batch = createImportBatch({
      sourceType: 'pdf',
      extractionMethod: 'agent',
      sourceFile: 'hapoalim-march-2026.pdf',
      providerUsed: 'openai-gpt-4o',
    });

    const { records, failures } = normalizeImport([BASE], batch);
    expect(failures).toHaveLength(0);
    const tx = records[0]!;

    expect(tx.importBatchId).toBe(batch.id);
    expect(tx.importTimestamp).toBe(batch.createdAt);
    expect(tx.sourceType).toBe('pdf');
    expect(tx.extractionMethod).toBe('agent');
    expect(tx.providerUsed).toBe('openai-gpt-4o');
    expect(tx.extractorVersion).toBe('1.0.0');
    expect(tx.sourceFile).toBe('hapoalim-march-2026.pdf');
    expect(tx.rawReference).toBe('page:3,row:12');
    expect(tx.confidenceScore).toBe(0.92);
    expect(tx.warnings).toHaveLength(1);
    expect(tx.warnings[0]?.field).toBe('date');
  });

  it('provenance is never lost across a re-normalization of the same raw record', () => {
    const batch1 = createImportBatch({ sourceType: 'pdf', extractionMethod: 'agent' });
    const batch2 = createImportBatch({ sourceType: 'pdf', extractionMethod: 'agent' });

    const { records: r1 } = normalizeImport([BASE], batch1);
    const { records: r2 } = normalizeImport([BASE], batch2);

    // Financial id is the same (idempotent)
    expect(r1[0]?.id).toBe(r2[0]?.id);
    // But batch provenance differs — each import is traceable to its own batch
    expect(r1[0]?.importBatchId).not.toBe(r2[0]?.importBatchId);
    expect(r1[0]?.importTimestamp).toBeDefined();
    expect(r2[0]?.importTimestamp).toBeDefined();
  });

  it('extractor warnings survive the pipeline intact', () => {
    const batch = createImportBatch({ sourceType: 'pdf', extractionMethod: 'ocr' });
    const raw: RawImportRecord = {
      ...BASE,
      extractionMethod: 'ocr',
      warnings: [
        { field: 'amount', message: 'Digit possibly misread (180 vs 180.5)', severity: 'warning' },
        { field: 'description', message: 'Partial text — truncated at edge', severity: 'info' },
      ],
    };
    const { records } = normalizeImport([raw], batch);
    expect(records[0]?.warnings).toHaveLength(2);
    expect(records[0]?.warnings[0]?.field).toBe('amount');
    expect(records[0]?.warnings[1]?.field).toBe('description');
  });

  it('scraper records have no confidence score by default', () => {
    const scraperRaw: RawImportRecord = {
      ...BASE,
      sourceType: 'scraper',
      extractionMethod: 'scraper',
      confidenceScore: undefined,
      warnings: [],
    };
    const batch = createImportBatch({ sourceType: 'scraper', extractionMethod: 'scraper' });
    const { records } = normalizeImport([scraperRaw], batch);
    expect(records[0]?.confidenceScore).toBeUndefined();
  });
});

describe('ImportBatch', () => {
  it('createImportBatch generates a unique id each call', () => {
    const b1 = createImportBatch({ sourceType: 'scraper', extractionMethod: 'scraper' });
    const b2 = createImportBatch({ sourceType: 'scraper', extractionMethod: 'scraper' });
    expect(b1.id).not.toBe(b2.id);
  });

  it('starts in pending status with zero transaction count', () => {
    const b = createImportBatch({ sourceType: 'scraper', extractionMethod: 'scraper' });
    expect(b.status).toBe('pending');
    expect(b.transactionCount).toBe(0);
    expect(b.accountIds).toEqual([]);
  });
});
