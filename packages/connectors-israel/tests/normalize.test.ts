import { describe, it, expect } from 'vitest';
import { normalizeAccount, normalizeTransaction, transactionId } from '../src/normalize.js';
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
    const account = normalizeAccount('hapoalim', 'bank', baseAccount);
    expect(account.institutionType).toBe('bank');
    const card = normalizeAccount('max', 'card', { accountNumber: 'CARD-1', txns: [] });
    expect(card.institutionType).toBe('card');
  });

  it('does not expose raw account number beyond the field', () => {
    const a = normalizeAccount('hapoalim', 'bank', baseAccount);
    // account number is in the designated field only — not in id or other fields
    expect(a.id).not.toContain(baseAccount.accountNumber);
  });
});

describe('transactionId', () => {
  it('is deterministic for identical input', () => {
    const account = normalizeAccount('hapoalim', 'bank', baseAccount);
    const id1 = transactionId(account.id, baseTx);
    const id2 = transactionId(account.id, baseTx);
    expect(id1).toBe(id2);
  });

  it('differs when amount changes', () => {
    const account = normalizeAccount('hapoalim', 'bank', baseAccount);
    const modified: ScraperTransaction = { ...baseTx, originalAmount: -999 };
    expect(transactionId(account.id, baseTx)).not.toBe(
      transactionId(account.id, modified),
    );
  });

  it('differs when date changes', () => {
    const account = normalizeAccount('hapoalim', 'bank', baseAccount);
    const modified: ScraperTransaction = {
      ...baseTx,
      date: '2026-04-01T00:00:00.000Z',
    };
    expect(transactionId(account.id, baseTx)).not.toBe(
      transactionId(account.id, modified),
    );
  });

  it('produces a 32-character hex string', () => {
    const account = normalizeAccount('hapoalim', 'bank', baseAccount);
    const id = transactionId(account.id, baseTx);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('normalizeTransaction', () => {
  it('maps scraper transaction fields to core-model Transaction', () => {
    const account = normalizeAccount('hapoalim', 'bank', baseAccount);
    const tx = normalizeTransaction(account.id, baseTx);
    expect(tx.accountId).toBe(account.id);
    expect(tx.amount).toBe(baseTx.chargedAmount);
    expect(tx.originalAmount).toBe(baseTx.originalAmount);
    expect(tx.originalCurrency).toBe('ILS');
    expect(tx.chargedCurrency).toBe('ILS');
    expect(tx.description).toBe(baseTx.description);
    expect(tx.status).toBe('completed');
    expect(tx.referenceId).toBe('REF001');
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
    const tx = normalizeTransaction(account.id, installmentTx);
    expect(tx.installmentNumber).toBe(1);
    expect(tx.installmentTotal).toBe(3);
  });

  it('handles unknown currency by falling back to ILS', () => {
    const account = normalizeAccount('hapoalim', 'bank', baseAccount);
    const tx: ScraperTransaction = {
      ...baseTx,
      originalCurrency: 'XYZ',
      chargedCurrency: undefined,
    };
    const normalized = normalizeTransaction(account.id, tx);
    expect(normalized.originalCurrency).toBe('ILS');
  });
});
