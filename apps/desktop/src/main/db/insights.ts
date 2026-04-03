import type Database from 'better-sqlite3';
import type { Transaction, Currency } from '@pocket/core-model';
import type { RawBatchRow } from '@pocket/insights';
import type { DateRange } from '@pocket/insights';

// ── Period queries ─────────────────────────────────────────────────────────────

/**
 * Fetch all accepted transactions in a date range as canonical Transaction objects.
 * The `warnings` and `installments` fields are JSON-encoded strings in the DB.
 */
export function getAcceptedTransactions(
  db: Database.Database,
  range?: DateRange,
  extraFilter?: { category?: string; merchant?: string },
): Transaction[] {
  const conditions: string[] = ["t.review_status = 'accepted'"];
  const params: (string | undefined)[] = [];

  if (range) {
    conditions.push('t.date >= ?');
    params.push(range.start);
    conditions.push('t.date < ?');
    params.push(range.end);
  }
  if (extraFilter?.category) {
    conditions.push('(t.user_category = ? OR t.category = ?)');
    params.push(extraFilter.category, extraFilter.category);
  }
  if (extraFilter?.merchant) {
    conditions.push('LOWER(t.description) LIKE ?');
    params.push(`%${extraFilter.merchant.toLowerCase()}%`);
  }

  const where = conditions.join(' AND ');

  return db.prepare<string[], {
    id: string; account_id: string; date: string; processed_date: string;
    amount: number; original_amount: number; original_currency: string;
    charged_currency: string; description: string; memo: string | null;
    status: string; category: string | null; user_category: string | null;
    source_type: string; source_file: string | null; import_batch_id: string;
    import_timestamp: string; extraction_method: string; provider_used: string | null;
    extractor_version: string | null; raw_reference: string | null;
    confidence_score: number | null; warnings: string; merchant_id: string | null;
    schema_version: number; reference_id: string | null;
    installment_number: number | null; installment_total: number | null;
  }>(`
    SELECT
      t.id, t.account_id, t.date, t.processed_date, t.amount, t.original_amount,
      t.original_currency, t.charged_currency, t.description, t.memo, t.status,
      t.category, t.user_category, t.source_type, t.source_file, t.import_batch_id,
      t.import_timestamp, t.extraction_method, t.provider_used, t.extractor_version,
      t.raw_reference, t.confidence_score, t.warnings, t.merchant_id, t.schema_version,
      t.reference_id, t.installment_number, t.installment_total
    FROM transactions t
    WHERE ${where}
    ORDER BY t.date ASC, t.id ASC
  `).all(...params.filter((p): p is string => p !== undefined)).map((r) => ({
    id: r.id,
    accountId: r.account_id,
    date: r.date,
    processedDate: r.processed_date,
    amount: r.amount,
    originalAmount: r.original_amount,
    originalCurrency: r.original_currency as Currency,
    chargedCurrency: r.charged_currency as Currency,
    description: r.description,
    memo: r.memo ?? undefined,
    status: r.status as Transaction['status'],
    category: r.user_category ?? r.category ?? undefined,
    sourceType: r.source_type as Transaction['sourceType'],
    sourceFile: r.source_file ?? undefined,
    importBatchId: r.import_batch_id,
    importTimestamp: r.import_timestamp,
    extractionMethod: r.extraction_method as Transaction['extractionMethod'],
    providerUsed: r.provider_used ?? undefined,
    extractorVersion: r.extractor_version ?? undefined,
    rawReference: r.raw_reference ?? undefined,
    confidenceScore: r.confidence_score ?? undefined,
    warnings: parseWarnings(r.warnings),
    merchantId: r.merchant_id ?? undefined,
    schemaVersion: r.schema_version,
    referenceId: r.reference_id ?? undefined,
    installmentNumber: r.installment_number ?? undefined,
    installmentTotal: r.installment_total ?? undefined,
  }));
}

function parseWarnings(raw: string): Transaction['warnings'] {
  try { return JSON.parse(raw) as Transaction['warnings']; } catch { return []; }
}

// ── Import health ─────────────────────────────────────────────────────────────

export function getBatchHealthRows(db: Database.Database): RawBatchRow[] {
  return db.prepare<[], {
    batch_id: string; created_at: string; source_type: string;
    extraction_method: string; status: string; total: number;
    pending: number; accepted: number; rejected: number;
  }>(`
    SELECT
      ib.id AS batch_id, ib.created_at, ib.source_type, ib.extraction_method, ib.status,
      COUNT(t.id) AS total,
      SUM(CASE WHEN t.review_status = 'pending'  THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN t.review_status = 'accepted' THEN 1 ELSE 0 END) AS accepted,
      SUM(CASE WHEN t.review_status = 'rejected' THEN 1 ELSE 0 END) AS rejected
    FROM import_batches ib
    LEFT JOIN transactions t ON t.import_batch_id = ib.id
    GROUP BY ib.id
    ORDER BY ib.created_at DESC
    LIMIT 50
  `).all().map((r) => ({
    batchId: r.batch_id,
    createdAt: r.created_at,
    sourceType: r.source_type,
    extractionMethod: r.extraction_method,
    status: r.status,
    total: r.total,
    pending: r.pending,
    accepted: r.accepted,
    rejected: r.rejected,
  }));
}

// ── Search / timeline ─────────────────────────────────────────────────────────

export interface SearchFilter {
  query?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  reviewStatus?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
}

export function searchTransactions(
  db: Database.Database,
  filter: SearchFilter,
): Transaction[] {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filter.query) {
    conditions.push('LOWER(t.description) LIKE ?');
    params.push(`%${filter.query.toLowerCase()}%`);
  }
  if (filter.startDate) { conditions.push('t.date >= ?'); params.push(filter.startDate); }
  if (filter.endDate)   { conditions.push('t.date < ?');  params.push(filter.endDate); }
  if (filter.category) {
    conditions.push('(t.user_category = ? OR t.category = ?)');
    params.push(filter.category, filter.category);
  }
  if (filter.reviewStatus && filter.reviewStatus !== 'all') {
    conditions.push('t.review_status = ?');
    params.push(filter.reviewStatus);
  }
  if (filter.minAmount != null) { conditions.push('t.amount >= ?'); params.push(filter.minAmount); }
  if (filter.maxAmount != null) { conditions.push('t.amount <= ?'); params.push(filter.maxAmount); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filter.limit ?? 200;

  return db.prepare<(string | number)[], {
    id: string; account_id: string; date: string; processed_date: string;
    amount: number; original_amount: number; original_currency: string;
    charged_currency: string; description: string; memo: string | null;
    status: string; category: string | null; user_category: string | null;
    source_type: string; source_file: string | null; import_batch_id: string;
    import_timestamp: string; extraction_method: string; provider_used: string | null;
    extractor_version: string | null; raw_reference: string | null;
    confidence_score: number | null; warnings: string; merchant_id: string | null;
    schema_version: number; reference_id: string | null;
    installment_number: number | null; installment_total: number | null;
  }>(`
    SELECT
      t.id, t.account_id, t.date, t.processed_date, t.amount, t.original_amount,
      t.original_currency, t.charged_currency, t.description, t.memo, t.status,
      t.category, t.user_category, t.source_type, t.source_file, t.import_batch_id,
      t.import_timestamp, t.extraction_method, t.provider_used, t.extractor_version,
      t.raw_reference, t.confidence_score, t.warnings, t.merchant_id, t.schema_version,
      t.reference_id, t.installment_number, t.installment_total
    FROM transactions t
    ${where}
    ORDER BY t.date DESC, t.id DESC
    LIMIT ${limit}
  `).all(...params).map(rowToTransaction);
}

function rowToTransaction(r: {
  id: string; account_id: string; date: string; processed_date: string;
  amount: number; original_amount: number; original_currency: string;
  charged_currency: string; description: string; memo: string | null;
  status: string; category: string | null; user_category: string | null;
  source_type: string; source_file: string | null; import_batch_id: string;
  import_timestamp: string; extraction_method: string; provider_used: string | null;
  extractor_version: string | null; raw_reference: string | null;
  confidence_score: number | null; warnings: string; merchant_id: string | null;
  schema_version: number; reference_id: string | null;
  installment_number: number | null; installment_total: number | null;
}): Transaction {
  return {
    id: r.id,
    accountId: r.account_id,
    date: r.date,
    processedDate: r.processed_date,
    amount: r.amount,
    originalAmount: r.original_amount,
    originalCurrency: r.original_currency as Currency,
    chargedCurrency: r.charged_currency as Currency,
    description: r.description,
    memo: r.memo ?? undefined,
    status: r.status as Transaction['status'],
    category: r.user_category ?? r.category ?? undefined,
    sourceType: r.source_type as Transaction['sourceType'],
    sourceFile: r.source_file ?? undefined,
    importBatchId: r.import_batch_id,
    importTimestamp: r.import_timestamp,
    extractionMethod: r.extraction_method as Transaction['extractionMethod'],
    providerUsed: r.provider_used ?? undefined,
    extractorVersion: r.extractor_version ?? undefined,
    rawReference: r.raw_reference ?? undefined,
    confidenceScore: r.confidence_score ?? undefined,
    warnings: parseWarnings(r.warnings),
    merchantId: r.merchant_id ?? undefined,
    schemaVersion: r.schema_version,
    referenceId: r.reference_id ?? undefined,
    installmentNumber: r.installment_number ?? undefined,
    installmentTotal: r.installment_total ?? undefined,
  };
}

// ── CSV export ─────────────────────────────────────────────────────────────────

export function getTransactionsForExport(
  db: Database.Database,
  filter: SearchFilter & { reviewStatus?: string },
): Array<Transaction & { reviewStatus: string }> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filter.startDate) { conditions.push('t.date >= ?'); params.push(filter.startDate); }
  if (filter.endDate)   { conditions.push('t.date < ?');  params.push(filter.endDate); }
  if (filter.category) {
    conditions.push('(t.user_category = ? OR t.category = ?)');
    params.push(filter.category, filter.category);
  }
  if (filter.reviewStatus && filter.reviewStatus !== 'all') {
    conditions.push('t.review_status = ?');
    params.push(filter.reviewStatus);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return db.prepare<(string | number)[], {
    id: string; account_id: string; date: string; processed_date: string;
    amount: number; original_amount: number; original_currency: string;
    charged_currency: string; description: string; memo: string | null;
    status: string; category: string | null; user_category: string | null;
    source_type: string; source_file: string | null; import_batch_id: string;
    import_timestamp: string; extraction_method: string; provider_used: string | null;
    extractor_version: string | null; raw_reference: string | null;
    confidence_score: number | null; warnings: string; merchant_id: string | null;
    schema_version: number; reference_id: string | null;
    installment_number: number | null; installment_total: number | null;
    review_status: string;
  }>(`
    SELECT
      t.id, t.account_id, t.date, t.processed_date, t.amount, t.original_amount,
      t.original_currency, t.charged_currency, t.description, t.memo, t.status,
      t.category, t.user_category, t.source_type, t.source_file, t.import_batch_id,
      t.import_timestamp, t.extraction_method, t.provider_used, t.extractor_version,
      t.raw_reference, t.confidence_score, t.warnings, t.merchant_id, t.schema_version,
      t.reference_id, t.installment_number, t.installment_total, t.review_status
    FROM transactions t
    ${where}
    ORDER BY t.date DESC
  `).all(...params).map((r) => ({
    ...rowToTransaction(r),
    reviewStatus: r.review_status,
  }));
}

// ── Category breakdown ─────────────────────────────────────────────────────────

export interface CategoryBreakdownItem {
  category: string;
  total: number;
  count: number;
}

export interface CashFlowPoint {
  date: string;
  spend: number;
  income: number;
  net: number;
}

/**
 * Aggregate accepted expense transactions by category for a date range.
 * Excludes accounting transfers (credit_card_payment, transfer, investments).
 * Only negative-amount transactions (expenses) are included.
 * Income is returned separately so the caller can render both if needed.
 */
export function getCategoryBreakdown(
  db: Database.Database,
  start: string,
  end: string,
): { expenses: CategoryBreakdownItem[]; income: CategoryBreakdownItem[] } {
  const EXCLUDED = `('credit_card_payment', 'transfer', 'investments')`;

  const rows = db.prepare<[string, string], {
    cat: string;
    total: number;
    count: number;
    is_expense: number;
  }>(`
    SELECT
      COALESCE(user_category, category, 'other') AS cat,
      SUM(ABS(amount))                            AS total,
      COUNT(*)                                    AS count,
      CASE WHEN amount < 0 THEN 1 ELSE 0 END      AS is_expense
    FROM transactions
    WHERE review_status = 'accepted'
      AND date >= ?
      AND date <  ?
      AND COALESCE(user_category, category, 'other') NOT IN ${EXCLUDED}
    GROUP BY cat, is_expense
    ORDER BY total DESC
  `).all(start, end);

  const expenses = rows.filter((r) => r.is_expense === 1).map((r) => ({
    category: r.cat,
    total: r.total,
    count: r.count,
  }));

  const income = rows.filter((r) => r.is_expense === 0).map((r) => ({
    category: r.cat,
    total: r.total,
    count: r.count,
  }));

  return { expenses, income };
}

export function getCashFlowSeries(
  db: Database.Database,
  start: string,
  end: string,
): CashFlowPoint[] {
  const EXCLUDED = `('credit_card_payment', 'transfer', 'investments')`;
  const rows = db.prepare<[string, string], {
    day: string;
    spend: number;
    income: number;
  }>(`
    SELECT
      substr(date, 1, 10) AS day,
      SUM(CASE
        WHEN amount < 0 AND COALESCE(user_category, category, 'other') NOT IN ${EXCLUDED}
        THEN ABS(amount)
        ELSE 0
      END) AS spend,
      SUM(CASE
        WHEN amount > 0 AND COALESCE(user_category, category, 'other') NOT IN ${EXCLUDED}
        THEN amount
        ELSE 0
      END) AS income
    FROM transactions
    WHERE review_status = 'accepted'
      AND date >= ?
      AND date < ?
    GROUP BY substr(date, 1, 10)
    ORDER BY day ASC
  `).all(start, end);

  const byDay = new Map(rows.map((row) => [row.day, row]));
  const result: CashFlowPoint[] = [];
  let cursor = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);

  while (cursor < endDate) {
    const day = cursor.toISOString().slice(0, 10);
    const row = byDay.get(day);
    const spend = round2(row?.spend ?? 0);
    const income = round2(row?.income ?? 0);
    result.push({
      date: day,
      spend,
      income,
      net: round2(income - spend),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

export function getAcceptedSourcesCount(
  db: Database.Database,
  start: string,
  end: string,
): number {
  const row = db.prepare<[string, string], { count: number }>(`
    SELECT COUNT(DISTINCT account_id) AS count
    FROM transactions
    WHERE review_status = 'accepted'
      AND date >= ?
      AND date < ?
  `).get(start, end);

  return row?.count ?? 0;
}

export function getLatestImportAt(db: Database.Database): string | null {
  const row = db.prepare<[], { created_at: string | null }>(`
    SELECT MAX(created_at) AS created_at
    FROM import_batches
  `).get();

  return row?.created_at ?? null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
