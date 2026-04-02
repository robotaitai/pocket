import type { Transaction, Account, Balance } from '@pocket/core-model';

/**
 * Sanitized synthetic fixtures for use in tests across all packages.
 * All values are fabricated — no real account numbers, names, or amounts.
 */

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

export const fixtureTransactions: Transaction[] = [
  {
    id: 'txn-0000000000000001',
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
    accountId: 'acc-max-0001',
    date: '2026-03-10T00:00:00.000Z',
    processedDate: '2026-03-11T00:00:00.000Z',
    amount: -400,
    originalAmount: -1200,
    originalCurrency: 'ILS',
    chargedCurrency: 'ILS',
    description: 'Electronics store',
    status: 'completed',
    installmentNumber: 1,
    installmentTotal: 3,
  },
];

export const fixtureBalances: Balance[] = [
  {
    accountId: 'acc-hapoalim-0001',
    amount: 5000,
    currency: 'ILS',
    asOf: '2026-03-31T00:00:00.000Z',
  },
];
