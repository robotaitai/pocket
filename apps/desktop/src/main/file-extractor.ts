/**
 * File extraction pipeline for manual import of PDF, XLSX, and CSV files.
 *
 * CSV:  parsed natively without any provider — no AI required.
 * XLSX: converted to CSV-like rows using the 'xlsx' library — no AI required.
 *       Justification for xlsx dep: no standard Node.js way to parse .xlsx files.
 * PDF:  text extraction requires a connected provider. Returns an error in local-only mode.
 *       Raw PDF bytes are NOT sent — only the document text layer is extracted first,
 *       then only the text (not account metadata) is sent to the provider.
 *
 * Privacy: no account IDs, balances, or existing DB data are included in any payload.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import * as XLSX from 'xlsx';
import type { AgentProvider, ExtractionResult } from '@pocket/agent-client';
import type { RawImportRecord } from '@pocket/core-model';
import { toRawImportRecord } from '@pocket/agent-client';

export type SupportedFileType = 'csv' | 'xlsx' | 'pdf';

export interface ExtractionOptions {
  filePath: string;
  accountId: string;
  provider: AgentProvider;
  defaultCurrency?: string;
  hint?: string;
}

export interface FileExtractionResult {
  records: RawImportRecord[];
  sourceType: SupportedFileType;
  overallConfidence: number;
  documentWarnings: string[];
  error?: string;
}

export async function extractFile(opts: ExtractionOptions): Promise<FileExtractionResult> {
  const ext = path.extname(opts.filePath).toLowerCase().slice(1) as SupportedFileType;

  switch (ext) {
    case 'csv':
      return extractCsv(opts);
    case 'xlsx':
      return extractXlsx(opts);
    case 'pdf':
      return extractPdf(opts);
    default:
      return {
        records: [],
        sourceType: 'csv',
        overallConfidence: 0,
        documentWarnings: [],
        error: `Unsupported file type: ${ext}. Supported: csv, xlsx, pdf`,
      };
  }
}

// ── CSV ────────────────────────────────────────────────────────────────────────

async function extractCsv(opts: ExtractionOptions): Promise<FileExtractionResult> {
  const raw = await readFile(opts.filePath, 'utf-8');
  const fileName = path.basename(opts.filePath);

  try {
    const records = parseCsvTransactions(raw, opts.accountId, fileName);
    return {
      records,
      sourceType: 'csv',
      overallConfidence: 1.0,
      documentWarnings: records.length === 0 ? ['No transactions found in CSV'] : [],
    };
  } catch (e) {
    return {
      records: [],
      sourceType: 'csv',
      overallConfidence: 0,
      documentWarnings: [],
      error: `CSV parse error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/**
 * Parse a CSV file into RawImportRecords.
 * Supports common column naming conventions from Israeli bank exports.
 *
 * Expected headers (case-insensitive, Hebrew aliases also supported):
 *   date, amount, description, currency, reference
 */
function parseCsvTransactions(csv: string, accountId: string, sourceFile: string): RawImportRecord[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0]!;
  const headers = splitCsvRow(headerLine).map((h) => h.toLowerCase().trim().replace(/['"]/g, ''));

  // Map common header names
  const colIdx = (names: string[]) => names.map((n) => headers.indexOf(n)).find((i) => i >= 0) ?? -1;

  const dateCol = colIdx(['date', 'transaction date', 'תאריך']);
  const amountCol = colIdx(['amount', 'sum', 'סכום', 'חיוב', 'זיכוי']);
  const descCol = colIdx(['description', 'details', 'פירוט', 'תיאור']);
  const currencyCol = colIdx(['currency', 'מטבע']);
  const refCol = colIdx(['reference', 'ref', 'אסמכתא']);

  if (dateCol < 0 || amountCol < 0 || descCol < 0) {
    throw new Error(`Missing required columns. Found: ${headers.join(', ')}`);
  }

  return lines.slice(1).map((line) => {
    const cols = splitCsvRow(line);
    const raw: RawImportRecord = {
      sourceType: 'csv',
      extractionMethod: 'structured-parse',
      sourceFile,
      accountId,
      date: cols[dateCol]?.replace(/['"]/g, '').trim() ?? '',
      amount: parseAmount(cols[amountCol] ?? '0'),
      originalAmount: parseAmount(cols[amountCol] ?? '0'),
      originalCurrency: currencyCol >= 0 ? (cols[currencyCol]?.replace(/['"]/g, '').trim() ?? 'ILS') : 'ILS',
      description: cols[descCol]?.replace(/['"]/g, '').trim() ?? '',
      referenceId: refCol >= 0 ? cols[refCol]?.replace(/['"]/g, '').trim() : undefined,
      status: 'completed',
    };
    return raw;
  }).filter((r) => r.date && r.description);
}

function splitCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if (char === ',' && !inQuotes) { result.push(current); current = ''; continue; }
    current += char;
  }
  result.push(current);
  return result;
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/['"₪$€£,\s]/g, '');
  return parseFloat(cleaned) || 0;
}

// ── XLSX ───────────────────────────────────────────────────────────────────────

async function extractXlsx(opts: ExtractionOptions): Promise<FileExtractionResult> {
  const fileName = path.basename(opts.filePath);
  try {
    const buf = await readFile(opts.filePath);
    const workbook = XLSX.read(buf, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { records: [], sourceType: 'xlsx', overallConfidence: 0, documentWarnings: ['Empty workbook'] };
    }
    const sheet = workbook.Sheets[sheetName]!;
    const csvText = XLSX.utils.sheet_to_csv(sheet);

    // Parse the CSV text just like a CSV file
    const records = parseCsvTransactions(csvText, opts.accountId, fileName);
    return {
      records: records.map((r) => ({ ...r, sourceType: 'xlsx' as const })),
      sourceType: 'xlsx',
      overallConfidence: 1.0,
      documentWarnings: records.length === 0 ? ['No transactions found in workbook'] : [],
    };
  } catch (e) {
    return {
      records: [],
      sourceType: 'xlsx',
      overallConfidence: 0,
      documentWarnings: [],
      error: `XLSX parse error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

// ── PDF ────────────────────────────────────────────────────────────────────────

/**
 * PDF extraction pipeline:
 *   1. Extract text from the PDF binary (no dep — works on any text-layer PDF).
 *   2. Try institution-specific native parsers first (no AI, no network).
 *      Currently supported: CAL / Diners credit card statements (כאל).
 *   3. Fall back to the connected AI provider for unrecognised formats.
 *
 * Privacy: only document text is sent to the provider — never account metadata.
 */
async function extractPdf(opts: ExtractionOptions): Promise<FileExtractionResult> {
  const fileName = path.basename(opts.filePath);
  const buf = await readFile(opts.filePath);
  const documentText = extractPdfText(buf);

  // ── 1. Native parsers (no AI required) ──
  if (isCalPdf(documentText)) {
    const records = parseCalPdf(documentText, opts.accountId, fileName);
    if (records.length > 0) {
      return {
        records,
        sourceType: 'pdf',
        overallConfidence: 0.95,
        documentWarnings: [],
      };
    }
  }

  // ── 2. AI provider fallback ──
  if (opts.provider.isLocal) {
    return {
      records: [],
      sourceType: 'pdf',
      overallConfidence: 0,
      documentWarnings: [],
      error:
        'Could not parse this PDF natively. Enable a connected AI provider in Settings → Agent Mode to extract transactions from unrecognised PDF formats.',
    };
  }

  try {
    const result = await opts.provider.extractDocument({
      documentText,
      hint: 'Israeli bank/credit card statement PDF',
      defaultCurrency: opts.defaultCurrency ?? 'ILS',
    });

    if (!result) {
      return {
        records: [],
        sourceType: 'pdf',
        overallConfidence: 0,
        documentWarnings: ['Provider returned no results for this document'],
        error: 'Extraction failed — the document may be image-only or encrypted',
      };
    }

    const records = result.transactions.map((t) =>
      toRawImportRecord(t, {
        accountId: opts.accountId,
        sourceType: 'pdf',
        sourceFile: fileName,
        providerType: opts.provider.type,
      }),
    );

    return {
      records,
      sourceType: 'pdf',
      overallConfidence: result.overallConfidence,
      documentWarnings: result.documentWarnings,
    };
  } catch (e) {
    return {
      records: [],
      sourceType: 'pdf',
      overallConfidence: 0,
      documentWarnings: [],
      error: `PDF extraction error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

// ── CAL / Diners native parser ─────────────────────────────────────────────────

/**
 * Detect a CAL (כאל) or Diners credit card PDF.
 * Matches the text-layer content extracted by extractPdfText.
 */
function isCalPdf(text: string): boolean {
  return /כאל|Cal\b|diners|Diners|כרטיסי אשראי ישראל/i.test(text);
}

/**
 * Parse a CAL / Diners monthly statement PDF into RawImportRecords.
 *
 * The text layer of these PDFs is extracted in LTR screen order, which for an
 * RTL Hebrew page means:
 *   - Dates appear with their digits reversed, e.g. the date 25/04/2025 becomes
 *     the string "5202/40/52" in the extracted text. Reversing that string gives
 *     the correct date "25/04/2025".
 *   - Hebrew words have their characters in visual (right-to-left) order; we use
 *     the whole word-cluster as the merchant name without attempting to reorder.
 *   - Amounts (₪ XX.XX) are always clean because digits are direction-neutral.
 *
 * Transaction row format in the extracted text (all on one or two lines):
 *   ₪ {charged_ils} ₪ {original_amount} {flags/category text} {merchant text} {reversed_date}
 *
 * Lines beginning with "₪" and containing "סה\"כ" are summary totals — skipped.
 */
function parseCalPdf(text: string, accountId: string, sourceFile: string): RawImportRecord[] {
  const records: RawImportRecord[] = [];

  // Join the whole text into one string and normalise whitespace
  const flat = text.replace(/\t/g, ' ').replace(/ {2,}/g, ' ');

  // Split on ₪ to get candidate transaction segments.
  // Each segment starting with a number followed by ₪ is a transaction row.
  // Pattern: ₪ {amount} ₪ {amount} {description+date}
  const txnPattern = /₪\s*([\d,]+\.?\d*)\s+₪\s*([\d,]+\.?\d*)\s+([^₪]+)/g;
  let match = txnPattern.exec(flat);

  while (match) {
    const chargedRaw = match[1]!.replace(/,/g, '');
    const originalRaw = match[2]!.replace(/,/g, '');
    const rest = (match[3] ?? '').trim();

    const charged = parseFloat(chargedRaw);
    const original = parseFloat(originalRaw);
    if (isNaN(charged) || charged <= 0) { match = txnPattern.exec(flat); continue; }

    // Skip summary lines
    if (/סה"כ|סהכ|total/i.test(rest)) { match = txnPattern.exec(flat); continue; }

    // The date is at the end: a sequence of digits and slashes (possibly with spaces)
    // that when reversed and joined gives a valid date like 25/04/2025 or 25/04/25.
    const dateMatch = rest.match(/([\d \t\/]{7,12})$/);
    let dateStr = '';
    let description = rest;

    if (dateMatch) {
      const rawDate = dateMatch[1]!.replace(/[\s\t]/g, '');
      // Reverse the string to correct the RTL extraction order
      const reversed = rawDate.split('').reverse().join('');
      // Parse DD/MM/YYYY or DD/MM/YY
      const parts = reversed.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const fullYear = (year!.length === 2) ? `20${year}` : year;
        const candidate = new Date(`${fullYear}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`);
        if (!isNaN(candidate.getTime())) {
          dateStr = candidate.toISOString();
          description = rest.slice(0, rest.length - dateMatch[1]!.length).trim();
        }
      }
    }

    if (!dateStr) { match = txnPattern.exec(flat); continue; }

    // Clean the merchant description: collapse spaces, strip leading flags like "לא הוראת קבע"
    description = description
      .replace(/^(לא|כן)\s+(הוראת\s+קבע|עמלה\s*\d*)\s*/u, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!description) description = 'CAL transaction';

    // Credit card charges are expenses (negative amount)
    records.push({
      sourceType: 'pdf',
      extractionMethod: 'structured-parse',
      sourceFile,
      accountId,
      date: dateStr,
      processedDate: dateStr,
      amount: -charged,
      originalAmount: -original,
      originalCurrency: 'ILS',
      chargedCurrency: 'ILS',
      description,
      status: 'completed',
    });

    match = txnPattern.exec(flat);
  }

  return records;
}

/**
 * Naive PDF text extraction — reads the text stream from the PDF byte content.
 * Handles simple text-layer PDFs. For complex PDFs (image-only, encrypted),
 * the provider must handle interpretation from partial text.
 *
 * This approach avoids adding a pdf-parse dependency. If the text layer is
 * absent, the provider receives the raw visible strings and uses its OCR/vision.
 */
function extractPdfText(buf: Buffer): string {
  const raw = buf.toString('latin1');
  // Extract text between BT (begin text) and ET (end text) markers
  const textChunks: string[] = [];
  const btEtPattern = /BT([\s\S]*?)ET/g;
  let m = btEtPattern.exec(raw);
  while (m) {
    // Extract strings from Tj and TJ operators
    const tjPattern = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g;
    let tj = tjPattern.exec(m[1] ?? '');
    while (tj) {
      textChunks.push(tj[1]?.replace(/\\n/g, '\n').replace(/\\\(/g, '(').replace(/\\\)/g, ')') ?? '');
      tj = tjPattern.exec(m[1] ?? '');
    }
    m = btEtPattern.exec(raw);
  }
  return textChunks.join(' ').replace(/\s+/g, ' ').trim() || '[PDF text extraction unavailable — the document may be image-only]';
}

// ── Ingestion into DB ──────────────────────────────────────────────────────────

import type Database from 'better-sqlite3';
import { normalizeImport, transactionId } from '@pocket/core-model';
import { createImportBatch } from '@pocket/core-model';
import type { ImportBatch } from '@pocket/core-model';

export interface IngestionResult {
  batchId: string;
  inserted: number;
  duplicates: number;
  errors: string[];
}

/**
 * Ingest extracted records into the local DB.
 * Creates an ImportBatch, runs normalization, deduplicates, inserts.
 * All records are inserted with review_status='pending' — they must pass review before being accepted.
 */
export function ingestExtractedRecords(
  db: Database.Database,
  records: RawImportRecord[],
  opts: {
    sourceType: SupportedFileType;
    extractionMethod: string;
    sourceFile: string;
    accountId: string;
    providerType: string;
    overallConfidence: number;
  },
): IngestionResult {
  const batch: ImportBatch = createImportBatch({
    sourceType: opts.sourceType,
    connectorId: `file-import:${opts.providerType}`,
    extractionMethod: opts.extractionMethod as ImportBatch['extractionMethod'],
    providerUsed: opts.providerType,
    extractorVersion: '1.0',
  });

  // Insert batch
  db.prepare(`
    INSERT INTO import_batches (id, created_at, source_type, connector_id, account_ids, transaction_count, status, extraction_method, provider_used, extractor_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    batch.id, batch.createdAt, batch.sourceType, batch.connectorId,
    JSON.stringify(batch.accountIds), batch.transactionCount, batch.status,
    batch.extractionMethod, batch.providerUsed ?? null, batch.extractorVersion ?? null,
  );

  let inserted = 0;
  let duplicates = 0;
  const errors: string[] = [];

  for (const record of records) {
    try {
      const normalized = normalizeImport([{ ...record, accountId: opts.accountId }], batch);

      for (const txn of normalized.records) {
        const id = transactionId(
          txn.accountId, txn.date, txn.processedDate,
          txn.originalAmount, txn.originalCurrency, txn.description,
        );
        const existing = db.prepare('SELECT id FROM transactions WHERE id = ?').get(id);
        if (existing) { duplicates++; continue; }

        db.prepare(`
          INSERT INTO transactions (
            id, account_id, date, processed_date, amount, original_amount, original_currency,
            charged_currency, description, memo, status, category, source_type, source_file,
            import_batch_id, import_timestamp, extraction_method, provider_used, extractor_version,
            raw_reference, confidence_score, warnings, merchant_id, schema_version, reference_id,
            installment_number, installment_total, review_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `).run(
          id, txn.accountId, txn.date, txn.processedDate, txn.amount, txn.originalAmount,
          txn.originalCurrency, txn.chargedCurrency, txn.description, txn.memo ?? null,
          txn.status, txn.category ?? null, txn.sourceType, txn.sourceFile ?? null,
          txn.importBatchId, txn.importTimestamp, txn.extractionMethod,
          txn.providerUsed ?? null, txn.extractorVersion ?? null, txn.rawReference ?? null,
          txn.confidenceScore ?? null, JSON.stringify(txn.warnings),
          txn.merchantId ?? null, txn.schemaVersion,
          txn.referenceId ?? null, txn.installmentNumber ?? null, txn.installmentTotal ?? null,
        );
        inserted++;
      }
    } catch (e) {
      errors.push(`Record "${record.description ?? '?'}": ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Update batch count
  db.prepare('UPDATE import_batches SET transaction_count = ? WHERE id = ?').run(inserted + duplicates, batch.id);

  return { batchId: batch.id, inserted, duplicates, errors };
}
