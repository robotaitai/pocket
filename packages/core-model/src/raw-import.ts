import type { SourceType, ExtractionMethod, Warning } from './provenance.js';

/**
 * RawImportRecord — the common input format for the normalization pipeline.
 *
 * Every ingestion path (scraper, PDF, XLSX, CSV, agent) must produce records
 * in this shape before calling the normalization pipeline. The pipeline
 * converts them into canonical Transaction records with full provenance.
 *
 * Ambiguous or low-confidence values should be expressed here with
 * `confidenceScore < 1` and/or `warnings`, NOT silently guessed.
 */
export interface RawImportRecord {
  // ── Source metadata ─────────────────────────────────────────────────────
  sourceType: SourceType;
  extractionMethod: ExtractionMethod;
  providerUsed?: string;
  extractorVersion?: string;
  /** Original filename for file-based imports. */
  sourceFile?: string;
  /**
   * Opaque reference to the raw source data, stored locally for traceability.
   * For scrapers: a JSON snapshot key. For files: byte-range or row number.
   */
  rawReference?: string;

  // ── Resolved account ─────────────────────────────────────────────────────
  /** Canonical account ID (already resolved by the caller). */
  accountId: string;

  // ── Financial data ───────────────────────────────────────────────────────
  /** ISO date string or parseable date string (normalized by pipeline). */
  date: string;
  /** ISO date string. Defaults to `date` when absent. */
  processedDate?: string;
  /** Negative = debit, positive = credit. */
  amount: number;
  originalAmount: number;
  /** Raw currency string — normalized to `Currency` by the pipeline. */
  originalCurrency: string;
  /** Raw charged currency. Defaults to `originalCurrency` when absent. */
  chargedCurrency?: string;
  description: string;
  memo?: string;
  status?: 'completed' | 'pending';
  /** Bank/provider reference number (asmachta). */
  referenceId?: string;

  // ── Categorization hints ─────────────────────────────────────────────────
  category?: string;
  merchantId?: string;

  // ── Installments ─────────────────────────────────────────────────────────
  installmentNumber?: number;
  installmentTotal?: number;

  // ── Confidence ───────────────────────────────────────────────────────────
  /**
   * 0–1 confidence in the extracted values.
   * Absent means the source is fully machine-readable (scraper / structured file).
   * Required for OCR and agent-extracted records.
   */
  confidenceScore?: number;
  /**
   * Warnings raised by the extractor about specific fields.
   * Must NOT be silently dropped — they are surfaced in the canonical record.
   */
  warnings?: Warning[];
}
