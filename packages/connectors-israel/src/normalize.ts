import { createHash } from 'node:crypto';
import type { Transaction, Account, Currency } from '@pocket/core-model';
import type { ScraperAccount, ScraperTransaction } from './scraper-types.js';

/**
 * Builds a deterministic transaction ID from stable fields.
 * The same transaction imported twice will always produce the same ID,
 * enabling idempotent upserts.
 */
export function transactionId(
  accountId: string,
  tx: ScraperTransaction,
): string {
  const input = [
    accountId,
    tx.date,
    tx.processedDate,
    tx.originalAmount.toFixed(4),
    tx.originalCurrency,
    tx.description,
  ].join('|');
  return createHash('sha256').update(input).digest('hex').slice(0, 32);
}

function toKnownCurrency(raw: string): Currency {
  const upper = raw.toUpperCase();
  if (upper === 'ILS' || upper === 'NIS') return 'ILS';
  if (upper === 'USD') return 'USD';
  if (upper === 'EUR') return 'EUR';
  if (upper === 'GBP') return 'GBP';
  // Unknown currencies fall back to ILS; logged at the adapter layer
  return 'ILS';
}

export function normalizeTransaction(
  accountId: string,
  tx: ScraperTransaction,
): Transaction {
  const id = transactionId(accountId, tx);
  return {
    id,
    accountId,
    date: tx.date,
    processedDate: tx.processedDate,
    amount: tx.chargedAmount,
    originalAmount: tx.originalAmount,
    originalCurrency: toKnownCurrency(tx.originalCurrency),
    chargedCurrency: toKnownCurrency(tx.chargedCurrency ?? tx.originalCurrency),
    description: tx.description,
    memo: tx.memo,
    status: tx.status,
    category: tx.category,
    installmentNumber: tx.installments?.number,
    installmentTotal: tx.installments?.total,
    referenceId:
      tx.identifier != null ? String(tx.identifier) : undefined,
  };
}

export function normalizeAccount(
  institutionId: string,
  institutionType: 'bank' | 'card',
  scraperAccount: ScraperAccount,
): Account {
  return {
    id: createHash('sha256')
      .update(`${institutionId}|${scraperAccount.accountNumber}`)
      .digest('hex')
      .slice(0, 32),
    institution: institutionId,
    institutionType,
    accountNumber: scraperAccount.accountNumber,
    currency: 'ILS',
  };
}
