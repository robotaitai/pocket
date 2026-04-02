import type { ScraperAccount } from '../../src/scraper-types.js';

/**
 * Sanitized fixture data for connector tests.
 * All values are synthetic — no real account numbers, names, or amounts.
 */
export const fixtureBank: ScraperAccount[] = [
  {
    accountNumber: '000-000001',
    balance: 5000,
    txns: [
      {
        type: 'normal',
        date: '2026-03-01T00:00:00.000Z',
        processedDate: '2026-03-02T00:00:00.000Z',
        originalAmount: -250,
        originalCurrency: 'ILS',
        chargedAmount: -250,
        chargedCurrency: 'ILS',
        description: 'Supermarket purchase',
        status: 'completed',
        identifier: 'REF001',
      },
      {
        type: 'normal',
        date: '2026-03-05T00:00:00.000Z',
        processedDate: '2026-03-06T00:00:00.000Z',
        originalAmount: -80,
        originalCurrency: 'ILS',
        chargedAmount: -80,
        chargedCurrency: 'ILS',
        description: 'Pharmacy',
        status: 'completed',
      },
    ],
  },
];

export const fixtureCard: ScraperAccount[] = [
  {
    accountNumber: 'CARD-0001',
    txns: [
      {
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
      },
    ],
  },
];
