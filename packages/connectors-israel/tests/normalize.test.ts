import { describe, it, expect } from 'vitest';
import { normalizeAccount, normalizeRawRecord } from '../src/normalize.js';
import { transactionId, normalizeImport, createImportBatch } from '@pocket/core-model';
import type { ScraperTransaction } from '../src/scraper-types.js';
import { fixtureBank } from './fixtures/scraper-accounts.js';

const baseAccount = fixtureBank[0]!;
const baseTx = baseAccount.txns[0]!;

describe('normalizeAccount', () => {
  it('assigns a deterministic id from institution + accountNumber', () => {
    const a = normalizeAccount('hapoalim', 'bank', baseAccount);
    const b = normalizeAccount('hapoalim', 'bank', baseAccount);
    expect(a.id).toBe(b.id);
    expect(a.id).toHaveLength(32);
  });

  it('different institutions produce different ids', () => {
    const a = normalizeAccount('hapoalim', 'bank', baseAccount);
    const b = normalizeAccount('leumi', 'bank', baseAccount);
    expect(a.id).not.toBe(b.id);
  });

  it('maps institution type correctly', () => {
    const bank = normalizeAccount('hapoalim', 'bank', baseAccount);
    expect(bank.institutionType).toBe('bank');
    const card = normalizeAccount('max', 'card', { accountNumber: 'CARD-1', txns: [] });
    expect(card.institutionType).toBe('card');
  });
});

describe('normalizeRawRecord', () => {
  it('produces a RawImportRecord with scraper source metadata', () => {
    const account = normalizeAccount('hapoalim', 'bank', baseAccount);
    const raw = normalizeRawRecord(account.id, 'hapoalim', baseTx);

    expect(raw.sourceType).toBe('scraper');
    expect(raw.extractionMethod).toBe('scraper');
    expect(raw.providerUsed).toBe('hapoalim');
    expect(raw.accountId).toBe(account.id);
    expect(raw.amount).toBe(baseTx.chargedAmount);
    expect(raw.originalAmount).toBe(baseTx.originalAmount);
    expect(raw.description).toBe(baseTx.description);
    expect(raw.status).toBe('completed');
    expect(raw.referenceId).toBe('REF001');
    expect(raw.warnings).toEqual([]);
    expect(raw.confidenceScore).toBeUndefined();
  });

  it('maps installments', () => {
    const cardAccount = { accountNumber: 'CARD-0001', txns: [] };
    const account = normalizeAccount('max', 'card', cardAccount);
    const installmentTx: ScraperTransaction = {
      type: 'installments',
      date: '2026-03-10T00:00:00.000Z',
      processedDate: '2026-03-11T00:00:00.000Z',
      originalAmount: -1200,
      originalCurrency: 'ILS',
      chargedAmount: -400,
      chargedCurrency: 'ILS',
      description: 'Electronics store',
      status: 'completed',
      installments: { number: 1, total: 3 },
    };
    const raw = normalizeRawRecord(account.id, 'max', installmentTx);
    expect(raw.installmentNumber).toBe(1);
    expect(raw.installmentTotal).toBe(3);
  });
});

describe('transactionId (from core-model)', () => {
  it('is deterministic for identical input', () => {
    const account = normalizeAccount('hapoalim', 'bank', baseAccount);
    const raw = normalizeRawRecord(account.id, 'hapoalim', baseTx);
    const id1 = transactionId(
      raw.accountId, raw.date, raw.processedDate ?? raw.date,
      raw.originalAmount, raw.originalCurrency, raw.description,
    );
    const id2 = transactionId(
      raw.accountId, raw.date, raw.processedDate ?? raw.date,
      raw.originalAmount, raw.originalCurrency, raw.description,
    );
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('normalizeImport integration (connector → pipeline)', () => {
  it('converts RawImportRecords to canonical Transactions with provenance', () => {
    const account = normalizeAccount('hapoalim', 'bank', baseAccount);
    const raws = baseAccount.txns.map((tx) => normalizeRawRecord(account.id, 'hapoalim', tx));
    const batch = createImportBatch({ sourceType: 'scraper', extractionMethod: 'scraper', providerUsed: 'hapoalim' });

    const { records, failures } = normalizeImport(raws, batch);
    expect(failures).toHaveLength(0);
    expect(records).toHaveLength(2);

    const tx = records[0]!;
    expect(tx.importBatchId).toBe(batch.id);
    expect(tx.importTimestamp).toBe(batch.createdAt);
    expect(tx.schemaVersion).toBe(2);
    expect(typeof tx.id).toBe('string');
  });
});
