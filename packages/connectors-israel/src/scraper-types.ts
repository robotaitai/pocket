/**
 * Minimal type declarations for external/israeli-bank-scrapers.
 *
 * These are declared here rather than imported from the submodule to:
 * 1. Keep typecheck independent of building the scraper
 * 2. Make the boundary explicit — only add what the connectors need
 *
 * Must be kept in sync with:
 *   external/israeli-bank-scrapers/src/definitions.ts
 *   external/israeli-bank-scrapers/src/transactions.ts
 *   external/israeli-bank-scrapers/src/scrapers/interface.ts
 */

export type ScraperCompanyId =
  | 'hapoalim'
  | 'leumi'
  | 'mizrahi'
  | 'discount'
  | 'mercantile'
  | 'otsarHahayal'
  | 'max'
  | 'visaCal'
  | 'isracard'
  | 'amex'
  | 'union'
  | 'beinleumi'
  | 'massad'
  | 'yahav'
  | 'oneZero'
  | 'behatsdaa'
  | 'beyahadBishvilha'
  | 'pagi';

export interface ScraperInstallments {
  number: number;
  total: number;
}

export interface ScraperTransaction {
  type: 'normal' | 'installments';
  identifier?: string | number;
  /** ISO date string */
  date: string;
  /** ISO date string */
  processedDate: string;
  originalAmount: number;
  originalCurrency: string;
  chargedAmount: number;
  chargedCurrency?: string;
  description: string;
  memo?: string;
  status: 'completed' | 'pending';
  installments?: ScraperInstallments;
  category?: string;
}

export interface ScraperAccount {
  accountNumber: string;
  balance?: number;
  txns: ScraperTransaction[];
}

export interface ScraperResult {
  success: boolean;
  accounts?: ScraperAccount[];
  errorType?: string;
  errorMessage?: string;
}

/** Minimal subset of scraper options used by our adapters. */
export interface ScraperRunOptions {
  companyId: ScraperCompanyId;
  startDate: Date;
  showBrowser?: boolean;
}
