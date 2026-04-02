import type { Account, RawImportRecord } from '@pocket/core-model';
import { createHash } from 'node:crypto';
import type { ScraperAccount, ScraperTransaction } from './scraper-types.js';

/**
 * Converts a scraper account into a canonical Account.
 * The account id is deterministic: sha256(institutionId|accountNumber).
 */
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

/**
 * Converts a raw scraper transaction into a RawImportRecord.
 * Provenance fields (importBatchId, importTimestamp) are intentionally absent
 * here — they are added by the normalization pipeline in @pocket/core-model
 * once the caller has created an ImportBatch.
 */
export function normalizeRawRecord(
  accountId: string,
  connectorId: string,
  tx: ScraperTransaction,
): RawImportRecord {
  return {
    sourceType: 'scraper',
    extractionMethod: 'scraper',
    providerUsed: connectorId,

    accountId,
    date: tx.date,
    processedDate: tx.processedDate,
    amount: tx.chargedAmount,
    originalAmount: tx.originalAmount,
    originalCurrency: tx.originalCurrency,
    chargedCurrency: tx.chargedCurrency,
    description: tx.description,
    memo: tx.memo,
    status: tx.status,
    referenceId: tx.identifier != null ? String(tx.identifier) : undefined,
    category: tx.category,
    installmentNumber: tx.installments?.number,
    installmentTotal: tx.installments?.total,

    // Scrapers are fully machine-controlled — no confidence score needed
    confidenceScore: undefined,
    warnings: [],
  };
}
