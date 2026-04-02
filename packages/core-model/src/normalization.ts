import { createHash } from 'node:crypto';
import type { Transaction, Currency, TransactionStatus } from './index.js';
import type { RawImportRecord } from './raw-import.js';
import type { ImportBatch } from './import-batch.js';
import type { Warning } from './provenance.js';

export const CURRENT_SCHEMA_VERSION = 2;

// ── ID generation ─────────────────────────────────────────────────────────────

/**
 * Deterministic transaction id: sha256 of stable financial fields.
 * Source-agnostic — same real transaction from scraper and PDF produces same id.
 */
export function transactionId(
  accountId: string,
  date: string,
  processedDate: string,
  originalAmount: number,
  originalCurrency: string,
  description: string,
): string {
  const input = [accountId, date, processedDate, originalAmount.toFixed(4), originalCurrency, description].join('|');
  return createHash('sha256').update(input).digest('hex').slice(0, 32);
}

// ── Validation ────────────────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validates a RawImportRecord and returns any structural errors.
 * Does NOT normalise — use `normalizeImport` for that.
 */
export function validateRawRecord(r: RawImportRecord): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!r.accountId) errors.push({ field: 'accountId', message: 'required' });
  if (!r.date) errors.push({ field: 'date', message: 'required' });
  if (typeof r.amount !== 'number' || !isFinite(r.amount)) {
    errors.push({ field: 'amount', message: 'must be a finite number' });
  }
  if (typeof r.originalAmount !== 'number' || !isFinite(r.originalAmount)) {
    errors.push({ field: 'originalAmount', message: 'must be a finite number' });
  }
  if (!r.originalCurrency) errors.push({ field: 'originalCurrency', message: 'required' });
  if (!r.description || r.description.trim() === '') {
    errors.push({ field: 'description', message: 'required and must not be blank' });
  }
  if (!r.sourceType) errors.push({ field: 'sourceType', message: 'required' });
  if (!r.extractionMethod) errors.push({ field: 'extractionMethod', message: 'required' });
  if (r.confidenceScore !== undefined && (r.confidenceScore < 0 || r.confidenceScore > 1)) {
    errors.push({ field: 'confidenceScore', message: 'must be between 0 and 1' });
  }
  return errors;
}

// ── Currency normalisation ────────────────────────────────────────────────────

const KNOWN_CURRENCIES = new Set<Currency>(['ILS', 'USD', 'EUR', 'GBP']);

function normalizeCurrency(raw: string, warnings: Warning[], field: string): Currency {
  const upper = raw.toUpperCase().trim();
  if (upper === 'NIS' || upper === 'ILS') return 'ILS';
  if (KNOWN_CURRENCIES.has(upper as Currency)) return upper as Currency;
  warnings.push({
    field,
    message: `Unknown currency '${raw}' — defaulting to ILS`,
    severity: 'warning',
  });
  return 'ILS';
}

// ── Date normalisation ────────────────────────────────────────────────────────

function normalizeDate(raw: string, warnings: Warning[], field: string): string {
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString();
  warnings.push({ field, message: `Unparseable date '${raw}' — kept as-is`, severity: 'warning' });
  return raw;
}

// ── Credit card payment detection ────────────────────────────────────────────

/**
 * Detects bank-account debit transactions that represent a payment to a credit
 * card company. These are transfers, not real expenses, and must be excluded
 * from expense totals to avoid double-counting (the individual card charges are
 * already tracked via the card connector).
 *
 * Patterns cover the common Hebrew and English descriptions that Israeli banks
 * use when debiting the account to settle a credit card balance.
 */
const CC_PAYMENT_PATTERNS: RegExp[] = [
  // Hebrew: "ל ויזה", "ל כ.א.ל", "ל ישראכרט", "ל מקס", "ל לאומי קארד", "ל דיינרס"
  /^ל\s+(ויזה|כ[\s.]?א[\s.]?ל|ישראכרט|מקס|לאומי\s*קארד|דיינרס|אמריקן\s*אקספרס)/,
  // Hebrew: "כרטיסי אשראי", "תשלום כרטיס אשראי"
  /כרטיסי?\s+אשראי/,
  // English descriptions that some banks emit
  /\bVISA\s+CARD\s+PAYMENT\b/i,
  /\bCREDIT\s+CARD\s+PAYMENT\b/i,
  /\bISRACARD\s+PAYMENT\b/i,
  /\bMAX\s+PAYMENT\b/i,
];

export function isCreditCardPayment(description: string): boolean {
  return CC_PAYMENT_PATTERNS.some((re) => re.test(description));
}

// ── Normalization pipeline ────────────────────────────────────────────────────

export interface NormalizationResult {
  /** Records that passed validation and were successfully normalized. */
  records: Transaction[];
  /**
   * Records that failed validation — each entry includes the source record
   * and the errors that prevented normalization.
   */
  failures: Array<{ raw: RawImportRecord; errors: ValidationError[] }>;
}

/**
 * Converts RawImportRecord[] + ImportBatch into canonical Transaction[].
 *
 * Rules:
 * - Records that fail validation land in `failures`, not `records`
 * - Ambiguous fields generate warnings on the canonical record, not silent guesses
 * - All provenance fields are sourced from the batch + raw record
 * - The transaction id is always deterministic — same real transaction from any
 *   source produces the same id, enabling cross-source deduplication
 */
export function normalizeImport(
  raws: RawImportRecord[],
  batch: ImportBatch,
): NormalizationResult {
  const records: Transaction[] = [];
  const failures: NormalizationResult['failures'] = [];
  const importTimestamp = batch.createdAt;

  for (const raw of raws) {
    const validationErrors = validateRawRecord(raw);
    if (validationErrors.length > 0) {
      failures.push({ raw, errors: validationErrors });
      continue;
    }

    const warnings: Warning[] = [...(raw.warnings ?? [])];

    const date = normalizeDate(raw.date, warnings, 'date');
    const processedDate = raw.processedDate
      ? normalizeDate(raw.processedDate, warnings, 'processedDate')
      : date;

    const originalCurrency = normalizeCurrency(raw.originalCurrency, warnings, 'originalCurrency');
    const chargedCurrency = raw.chargedCurrency
      ? normalizeCurrency(raw.chargedCurrency, warnings, 'chargedCurrency')
      : originalCurrency;

    const status: TransactionStatus =
      raw.status === 'pending' ? 'pending' : 'completed';

    const id = transactionId(
      raw.accountId,
      date,
      processedDate,
      raw.originalAmount,
      raw.originalCurrency,
      raw.description,
    );

    const tx: Transaction = {
      id,
      schemaVersion: CURRENT_SCHEMA_VERSION,

      // Provenance — sourced from batch + raw record
      importBatchId: batch.id,
      sourceType: raw.sourceType,
      sourceFile: raw.sourceFile ?? batch.sourceFile,
      importTimestamp,
      extractionMethod: raw.extractionMethod,
      providerUsed: raw.providerUsed ?? batch.providerUsed,
      extractorVersion: raw.extractorVersion ?? batch.extractorVersion,
      rawReference: raw.rawReference,

      // Confidence
      confidenceScore: raw.confidenceScore,
      warnings,

      // Financial data
      accountId: raw.accountId,
      date,
      processedDate,
      amount: raw.amount,
      originalAmount: raw.originalAmount,
      originalCurrency,
      chargedCurrency,
      description: raw.description,
      memo: raw.memo,
      status,
      // Auto-detect credit card payments (bank-account debits settling a card balance).
      // These are transfers, not expenses — insights layer excludes them from expense totals.
      category: raw.category ?? (isCreditCardPayment(raw.description) ? 'credit_card_payment' : undefined),
      merchantId: raw.merchantId,
      installmentNumber: raw.installmentNumber,
      installmentTotal: raw.installmentTotal,
      referenceId: raw.referenceId,
    };

    records.push(tx);
  }

  return { records, failures };
}
