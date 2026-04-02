// ── Provenance ──────────────────────────────────────────────────────────────
export type { SourceType, ExtractionMethod, Warning, Provenance } from './provenance.js';

// ── Import batch ────────────────────────────────────────────────────────────
export type { ImportBatch, ImportBatchStatus } from './import-batch.js';
export { createImportBatch } from './import-batch.js';

// ── Merchant ─────────────────────────────────────────────────────────────────
export type { Merchant } from './merchant.js';

// ── Raw import ───────────────────────────────────────────────────────────────
export type { RawImportRecord } from './raw-import.js';

// ── Normalization pipeline ────────────────────────────────────────────────────
export type { NormalizationResult, ValidationError } from './normalization.js';
export { normalizeImport, validateRawRecord, transactionId, isCreditCardPayment } from './normalization.js';

// ── Deduplication ─────────────────────────────────────────────────────────────
export type { DedupeResult, PotentialDuplicate } from './dedupe.js';
export { deduplicateById, findPotentialDuplicates } from './dedupe.js';

// ── Core domain types ─────────────────────────────────────────────────────────

export type Currency = 'ILS' | 'USD' | 'EUR' | 'GBP';

export type InstitutionType = 'bank' | 'card';

export interface Account {
  /** Locally-generated deterministic ID. Never uploaded. */
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

/**
 * Canonical Transaction — the one internal schema all ingestion paths must
 * produce. UI, chat, insights, and exports consume only this type.
 *
 * Every field in the `Provenance` block is required. Records without full
 * provenance must not reach the DB or downstream layers.
 *
 * Schema is versioned; `schemaVersion` allows forward-compatible migrations.
 */
export interface Transaction {
  // ── Identity & versioning ───────────────────────────────────────────────
  /**
   * Deterministic id: sha256(accountId|date|processedDate|originalAmount|originalCurrency|description).slice(0,32).
   * Same transaction imported twice from different sources produces the same id.
   */
  id: string;
  schemaVersion: number;

  // ── Provenance (required — set by normalization pipeline) ───────────────
  importBatchId: string;
  sourceType: import('./provenance.js').SourceType;
  sourceFile?: string;
  /** ISO 8601 timestamp of when this record was imported. */
  importTimestamp: string;
  extractionMethod: import('./provenance.js').ExtractionMethod;
  providerUsed?: string;
  extractorVersion?: string;
  rawReference?: string;

  // ── Confidence ──────────────────────────────────────────────────────────
  /**
   * Absent for fully-trusted scraper/structured-parse imports.
   * Required (0–1) for OCR and agent-extracted records.
   */
  confidenceScore?: number;
  /** Warnings from the extractor about ambiguous or low-confidence fields. */
  warnings: import('./provenance.js').Warning[];

  // ── Core financial data ─────────────────────────────────────────────────
  accountId: string;
  /** ISO date string — the date shown on the statement. */
  date: string;
  /** ISO date string — the date the charge was processed. */
  processedDate: string;
  /** Negative = debit, positive = credit. In `chargedCurrency`. */
  amount: number;
  originalAmount: number;
  originalCurrency: Currency;
  chargedCurrency: Currency;
  description: string;
  memo?: string;
  status: TransactionStatus;

  // ── Categorization ──────────────────────────────────────────────────────
  category?: string;
  merchantId?: string;

  // ── Installments ────────────────────────────────────────────────────────
  installmentNumber?: number;
  installmentTotal?: number;

  /** Bank-assigned reference (asmachta). Never uploaded. */
  referenceId?: string;
}
