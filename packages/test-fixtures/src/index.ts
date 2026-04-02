import type { Transaction, Account, Balance, ImportBatch, RawImportRecord } from '@pocket/core-model';

/**
 * Sanitized synthetic fixtures for use in tests across all packages.
 * All values are fabricated — no real account numbers, names, or amounts.
 *
 * All Transaction fixtures carry full provenance (schema v2 canonical form).
 */

// ── Accounts ──────────────────────────────────────────────────────────────────

export const fixtureAccounts: Account[] = [
  {
    id: 'acc-hapoalim-0001',
    institution: 'hapoalim',
    institutionType: 'bank',
    accountNumber: '000-000001',
    currency: 'ILS',
    label: 'Test Checking',
  },
  {
    id: 'acc-max-0001',
    institution: 'max',
    institutionType: 'card',
    accountNumber: 'CARD-0001',
    currency: 'ILS',
    label: 'Test Card',
  },
];

// ── Import batches ────────────────────────────────────────────────────────────

export const fixtureImportBatch: ImportBatch = {
  id: 'batch-fixture-0001',
  createdAt: '2026-03-31T12:00:00.000Z',
  sourceType: 'scraper',
  connectorId: 'hapoalim',
  accountIds: ['acc-hapoalim-0001'],
  transactionCount: 2,
  status: 'completed',
  extractionMethod: 'scraper',
  providerUsed: 'hapoalim',
};

export const fixturePdfImportBatch: ImportBatch = {
  id: 'batch-fixture-pdf-0001',
  createdAt: '2026-03-31T13:00:00.000Z',
  sourceType: 'pdf',
  sourceFile: 'hapoalim-march-2026.pdf',
  accountIds: ['acc-hapoalim-0001'],
  transactionCount: 1,
  status: 'completed',
  extractionMethod: 'agent',
  providerUsed: 'openai-gpt-4o',
};

// ── Canonical Transactions (schema v2, full provenance) ───────────────────────

export const fixtureTransactions: Transaction[] = [
  {
    id: 'txn-0000000000000001',
    schemaVersion: 2,
    importBatchId: 'batch-fixture-0001',
    sourceType: 'scraper',
    importTimestamp: '2026-03-31T12:00:00.000Z',
    extractionMethod: 'scraper',
    providerUsed: 'hapoalim',
    warnings: [],
    accountId: 'acc-hapoalim-0001',
    date: '2026-03-01T00:00:00.000Z',
    processedDate: '2026-03-02T00:00:00.000Z',
    amount: -250,
    originalAmount: -250,
    originalCurrency: 'ILS',
    chargedCurrency: 'ILS',
    description: 'Supermarket purchase',
    status: 'completed',
    category: 'groceries',
  },
  {
    id: 'txn-0000000000000002',
    schemaVersion: 2,
    importBatchId: 'batch-fixture-0001',
    sourceType: 'scraper',
    importTimestamp: '2026-03-31T12:00:00.000Z',
    extractionMethod: 'scraper',
    providerUsed: 'hapoalim',
    warnings: [],
    accountId: 'acc-hapoalim-0001',
    date: '2026-03-05T00:00:00.000Z',
    processedDate: '2026-03-06T00:00:00.000Z',
    amount: -80,
    originalAmount: -80,
    originalCurrency: 'ILS',
    chargedCurrency: 'ILS',
    description: 'Pharmacy',
    status: 'completed',
    category: 'health',
  },
  {
    id: 'txn-0000000000000003',
    schemaVersion: 2,
    importBatchId: 'batch-fixture-pdf-0001',
    sourceType: 'pdf',
    sourceFile: 'hapoalim-march-2026.pdf',
    importTimestamp: '2026-03-31T13:00:00.000Z',
    extractionMethod: 'agent',
    providerUsed: 'openai-gpt-4o',
    confidenceScore: 0.92,
    warnings: [{ field: 'date', message: 'Day/month order ambiguous', severity: 'warning' }],
    accountId: 'acc-hapoalim-0001',
    date: '2026-03-10T00:00:00.000Z',
    processedDate: '2026-03-10T00:00:00.000Z',
    amount: -180,
    originalAmount: -180,
    originalCurrency: 'ILS',
    chargedCurrency: 'ILS',
    description: 'Coffee shop',
    status: 'completed',
  },
];

// ── Raw import records (pre-normalization) ─────────────────────────────────────

export const fixtureRawRecords: RawImportRecord[] = [
  {
    sourceType: 'scraper',
    extractionMethod: 'scraper',
    providerUsed: 'hapoalim',
    accountId: 'acc-hapoalim-0001',
    date: '2026-03-01T00:00:00.000Z',
    processedDate: '2026-03-02T00:00:00.000Z',
    amount: -250,
    originalAmount: -250,
    originalCurrency: 'ILS',
    description: 'Supermarket purchase',
    status: 'completed',
    warnings: [],
  },
  {
    sourceType: 'pdf',
    extractionMethod: 'agent',
    providerUsed: 'openai-gpt-4o',
    sourceFile: 'hapoalim-march-2026.pdf',
    accountId: 'acc-hapoalim-0001',
    date: '2026-03-10T00:00:00.000Z',
    amount: -180,
    originalAmount: -180,
    originalCurrency: 'ILS',
    description: 'Coffee shop',
    status: 'completed',
    confidenceScore: 0.92,
    warnings: [{ field: 'date', message: 'Day/month order ambiguous', severity: 'warning' }],
  },
];

// ── Balances ──────────────────────────────────────────────────────────────────

export const fixtureBalances: Balance[] = [
  {
    accountId: 'acc-hapoalim-0001',
    amount: 5000,
    currency: 'ILS',
    asOf: '2026-03-31T00:00:00.000Z',
  },
];
