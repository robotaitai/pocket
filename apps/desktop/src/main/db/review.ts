import type Database from 'better-sqlite3';

export type ReviewStatus = 'pending' | 'accepted' | 'rejected';

export interface ReviewTransaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  originalCurrency: string;
  status: string;
  category: string | null;
  userCategory: string | null;
  /** Effective category: userCategory takes precedence over category. */
  effectiveCategory: string | null;
  reviewStatus: ReviewStatus;
  reviewedAt: string | null;
  sourceType: string;
  extractionMethod: string;
  importBatchId: string;
  providerUsed: string | null;
  sourceFile: string | null;
  confidenceScore: number | null;
  /** JSON-encoded Warning[] — parse before use. */
  warningsJson: string;
  installmentNumber: number | null;
  installmentTotal: number | null;
}

export interface ReviewBatchSummary {
  batchId: string;
  createdAt: string;
  sourceType: string;
  sourceFile: string | null;
  connectorId: string | null;
  extractionMethod: string;
  providerUsed: string | null;
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
}

export interface UndoResult {
  restoredCount: number;
  actionType: string;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function getBatchSummaries(db: Database.Database): ReviewBatchSummary[] {
  return db.prepare<[], {
    batch_id: string; created_at: string; source_type: string; source_file: string | null;
    connector_id: string | null; extraction_method: string; provider_used: string | null;
    total: number; pending: number; accepted: number; rejected: number;
  }>(`
    SELECT
      ib.id          AS batch_id,
      ib.created_at,
      ib.source_type,
      ib.source_file,
      ib.connector_id,
      ib.extraction_method,
      ib.provider_used,
      COUNT(t.id)                                         AS total,
      SUM(CASE WHEN t.review_status = 'pending'  THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN t.review_status = 'accepted' THEN 1 ELSE 0 END) AS accepted,
      SUM(CASE WHEN t.review_status = 'rejected' THEN 1 ELSE 0 END) AS rejected
    FROM import_batches ib
    LEFT JOIN transactions t ON t.import_batch_id = ib.id
    GROUP BY ib.id
    ORDER BY ib.created_at DESC
  `).all().map((r) => ({
    batchId: r.batch_id,
    createdAt: r.created_at,
    sourceType: r.source_type,
    sourceFile: r.source_file,
    connectorId: r.connector_id,
    extractionMethod: r.extraction_method,
    providerUsed: r.provider_used,
    total: r.total,
    pending: r.pending,
    accepted: r.accepted,
    rejected: r.rejected,
  }));
}

export function getTransactionsForReview(
  db: Database.Database,
  opts: { batchId?: string; reviewStatus?: ReviewStatus | 'all' } = {},
): ReviewTransaction[] {
  const conditions: string[] = [];
  const params: (string | undefined)[] = [];

  if (opts.batchId) {
    conditions.push('t.import_batch_id = ?');
    params.push(opts.batchId);
  }
  if (opts.reviewStatus && opts.reviewStatus !== 'all') {
    conditions.push('t.review_status = ?');
    params.push(opts.reviewStatus);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return db.prepare<string[], {
    id: string; account_id: string; date: string; description: string;
    amount: number; original_currency: string; status: string;
    category: string | null; user_category: string | null;
    review_status: string; reviewed_at: string | null;
    source_type: string; extraction_method: string;
    import_batch_id: string; provider_used: string | null;
    source_file: string | null; confidence_score: number | null;
    warnings: string; installment_number: number | null; installment_total: number | null;
  }>(`
    SELECT
      t.id, t.account_id, t.date, t.description, t.amount,
      t.original_currency, t.status, t.category, t.user_category,
      t.review_status, t.reviewed_at,
      t.source_type, t.extraction_method, t.import_batch_id,
      t.provider_used, t.source_file, t.confidence_score,
      t.warnings, t.installment_number, t.installment_total
    FROM transactions t
    ${where}
    ORDER BY t.date ASC, t.id ASC
  `).all(...params.filter((p): p is string => p !== undefined)).map((r) => ({
    id: r.id,
    accountId: r.account_id,
    date: r.date,
    description: r.description,
    amount: r.amount,
    originalCurrency: r.original_currency,
    status: r.status,
    category: r.category,
    userCategory: r.user_category,
    effectiveCategory: r.user_category ?? r.category,
    reviewStatus: r.review_status as ReviewStatus,
    reviewedAt: r.reviewed_at,
    sourceType: r.source_type,
    extractionMethod: r.extraction_method,
    importBatchId: r.import_batch_id,
    providerUsed: r.provider_used,
    sourceFile: r.source_file,
    confidenceScore: r.confidence_score,
    warningsJson: r.warnings,
    installmentNumber: r.installment_number,
    installmentTotal: r.installment_total,
  }));
}

export function setReviewStatus(
  db: Database.Database,
  ids: string[],
  status: ReviewStatus,
  actionType: string,
): void {
  if (ids.length === 0) return;

  // Snapshot previous state for undo
  const prevRows = db.prepare<string[], { id: string; review_status: string; user_category: string | null }>(
    `SELECT id, review_status, user_category FROM transactions WHERE id IN (${ids.map(() => '?').join(',')})`,
  ).all(...ids);

  const prevStatuses: Record<string, { review_status: string; user_category: string | null }> = {};
  for (const r of prevRows) prevStatuses[r.id] = { review_status: r.review_status, user_category: r.user_category };

  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE transactions SET review_status = ?, reviewed_at = ? WHERE id = ?');
  for (const id of ids) stmt.run(status, now, id);

  recordAction(db, actionType, ids, prevStatuses, undefined);
}

export function setTransactionCategory(
  db: Database.Database,
  id: string,
  category: string,
): void {
  const prev = db.prepare<[string], { review_status: string; user_category: string | null }>(
    'SELECT review_status, user_category FROM transactions WHERE id = ?',
  ).get(id);

  if (!prev) return;

  db.prepare('UPDATE transactions SET user_category = ?, reviewed_at = ? WHERE id = ?')
    .run(category, new Date().toISOString(), id);

  recordAction(db, 'set_category', [id], { [id]: prev }, category);
}

export function undoLastAction(db: Database.Database): UndoResult {
  const action = db.prepare<[], {
    id: string; action: string; transaction_ids: string; prev_statuses: string;
  }>('SELECT id, action, transaction_ids, prev_statuses FROM review_actions ORDER BY created_at DESC LIMIT 1').get();

  if (!action) return { restoredCount: 0, actionType: 'none' };

  const ids = JSON.parse(action.transaction_ids) as string[];
  const prevStatuses = JSON.parse(action.prev_statuses) as Record<string, { review_status: string; user_category: string | null }>;

  const stmt = db.prepare('UPDATE transactions SET review_status = ?, user_category = ? WHERE id = ?');
  for (const id of ids) {
    const prev = prevStatuses[id];
    if (prev) stmt.run(prev.review_status, prev.user_category, id);
  }

  db.prepare('DELETE FROM review_actions WHERE id = ?').run(action.id);

  return { restoredCount: ids.length, actionType: action.action };
}

function recordAction(
  db: Database.Database,
  action: string,
  ids: string[],
  prevStatuses: Record<string, unknown>,
  category: string | undefined,
): void {
  const id = `ra-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(`
    INSERT INTO review_actions (id, created_at, action, transaction_ids, prev_statuses, category)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, new Date().toISOString(), action, JSON.stringify(ids), JSON.stringify(prevStatuses), category ?? null);

  // Keep only the last 50 undo entries
  db.exec(`
    DELETE FROM review_actions WHERE id NOT IN (
      SELECT id FROM review_actions ORDER BY created_at DESC LIMIT 50
    )
  `);
}
