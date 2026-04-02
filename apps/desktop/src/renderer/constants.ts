export const CATEGORIES = [
  'groceries',
  'dining',
  'transport',
  'health',
  'utilities',
  'entertainment',
  'shopping',
  'education',
  'banking',
  'savings',
  'investments',
  'income',
  'transfer',
  'credit_card_payment',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<string, string> = {
  groceries: 'Groceries',
  dining: 'Dining',
  transport: 'Transport',
  health: 'Health',
  utilities: 'Utilities',
  entertainment: 'Entertainment',
  shopping: 'Shopping',
  education: 'Education',
  banking: 'Banking',
  savings: 'Savings',
  investments: 'Investments',
  income: 'Income',
  transfer: 'Transfer',
  credit_card_payment: 'Credit Card Payment',
  other: 'Other',
};

// Categories that represent transfers of wealth rather than real spending.
// Excluded from expense totals in all summaries and dashboards.
export const NON_EXPENSE_CATEGORIES = new Set([
  'investments',
  'credit_card_payment',
  'transfer',
  'income',
  'savings',
]);

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  scraper: 'Scraper',
  pdf: 'PDF',
  xlsx: 'Excel',
  csv: 'CSV',
  api: 'API',
  fixture: 'Fixture',
};
