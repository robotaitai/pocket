export const CATEGORIES = [
  // Income
  'income',
  'rental_income',
  // Housing
  'mortgage',
  'home_maintenance',
  // Daily spending
  'groceries',
  'dining',
  'transport',
  'health',
  'utilities',
  'entertainment',
  'shopping',
  'education',
  // Financial
  'investments',
  'savings',
  'banking',
  'donations',
  // Transfers (excluded from expense totals)
  'transfer',
  'credit_card_payment',
  // Catch-all
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<string, string> = {
  income: 'Income',
  rental_income: 'Rental Income',
  mortgage: 'Mortgage',
  home_maintenance: 'Home Maintenance',
  groceries: 'Groceries',
  dining: 'Dining',
  transport: 'Transport',
  health: 'Health',
  utilities: 'Utilities',
  entertainment: 'Entertainment',
  shopping: 'Shopping',
  education: 'Education',
  investments: 'Investments',
  savings: 'Savings',
  banking: 'Banking',
  donations: 'Donations',
  transfer: 'Transfer',
  credit_card_payment: 'Credit Card Payment',
  other: 'Other',
};

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  scraper: 'Scraper',
  pdf: 'PDF',
  xlsx: 'Excel',
  csv: 'CSV',
  api: 'API',
  fixture: 'Fixture',
};
