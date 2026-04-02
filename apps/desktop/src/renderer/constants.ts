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
  'income',
  'transfer',
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
  income: 'Income',
  transfer: 'Transfer',
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
