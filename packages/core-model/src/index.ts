export type Currency = 'ILS' | 'USD' | 'EUR' | 'GBP';

export type InstitutionType = 'bank' | 'card';

export interface Account {
  /** Locally-generated UUID. Never uploaded. */
  id: string;
  /** Scraper company key, e.g. 'hapoalim', 'max'. Never uploaded. */
  institution: string;
  institutionType: InstitutionType;
  /** Masked or partial number for display. Never uploaded. */
  accountNumber: string;
  currency: Currency;
  label?: string;
}

export interface Balance {
  accountId: string;
  amount: number;
  currency: Currency;
  /** ISO date string */
  asOf: string;
}

export type TransactionStatus = 'completed' | 'pending';

export interface Transaction {
  /**
   * Deterministic ID: sha256(accountId + date + processedDate + originalAmount + description).
   * Provides idempotency across repeated imports.
   */
  id: string;
  accountId: string;
  /** ISO date string — the date shown on the statement */
  date: string;
  /** ISO date string — the date the charge was processed */
  processedDate: string;
  /** Negative for debits, positive for credits. In chargedCurrency. */
  amount: number;
  originalAmount: number;
  originalCurrency: Currency;
  chargedCurrency: Currency;
  description: string;
  memo?: string;
  status: TransactionStatus;
  category?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  /** Bank-assigned reference (asmachta). Never uploaded. */
  referenceId?: string;
}
