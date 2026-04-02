export const CATEGORIES = [
  // Income
  'income',
  'rental_income',
  // Housing
  'rent',
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
  rent: 'Rent',
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

/**
 * One canonical color per category.
 * Used for pie chart slices, legend dots, and tag badges throughout the UI.
 * Chosen to be visually distinct and semantically meaningful.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  // Income — greens
  income:           '#16a34a',
  rental_income:    '#0d9488',
  // Housing — indigos
  rent:             '#3730a3',
  mortgage:         '#4338ca',
  home_maintenance: '#7c3aed',
  // Daily spending
  groceries:        '#d97706',
  dining:           '#ea580c',
  transport:        '#0284c7',
  health:           '#e11d48',
  utilities:        '#0891b2',
  entertainment:    '#9333ea',
  shopping:         '#db2777',
  education:        '#2563eb',
  // Financial
  investments:      '#059669',
  savings:          '#15803d',
  banking:          '#475569',
  donations:        '#b45309',
  // Transfers (shown in UI but excluded from expense totals)
  transfer:         '#9ca3af',
  credit_card_payment: '#6b7280',
  // Catch-all
  other:            '#d1d5db',
};

/** Light background tint paired with CATEGORY_COLORS for badges/chips. */
export const CATEGORY_BG_COLORS: Record<string, string> = {
  income:           '#dcfce7',
  rental_income:    '#ccfbf1',
  rent:             '#e0e7ff',
  mortgage:         '#e0e7ff',
  home_maintenance: '#ede9fe',
  groceries:        '#fef3c7',
  dining:           '#ffedd5',
  transport:        '#e0f2fe',
  health:           '#ffe4e6',
  utilities:        '#cffafe',
  entertainment:    '#f3e8ff',
  shopping:         '#fce7f3',
  education:        '#dbeafe',
  investments:      '#d1fae5',
  savings:          '#dcfce7',
  banking:          '#f1f5f9',
  donations:        '#fef3c7',
  transfer:         '#f3f4f6',
  credit_card_payment: '#f9fafb',
  other:            '#f3f4f6',
};

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  scraper: 'Scraper',
  pdf: 'PDF',
  xlsx: 'Excel',
  csv: 'CSV',
  api: 'API',
  fixture: 'Fixture',
};
