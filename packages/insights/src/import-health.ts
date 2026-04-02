import type { ImportBatchHealth, ImportHealthReport } from './types.js';

export interface RawBatchRow {
  batchId: string;
  createdAt: string;
  sourceType: string;
  extractionMethod: string;
  status: string;
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
}

/**
 * Build an ImportHealthReport from raw batch rows (as returned by the DB layer).
 * Pure function — no DB dependency.
 */
export function buildImportHealthReport(batches: RawBatchRow[]): ImportHealthReport {
  const now = new Date();
  const nowMs = now.getTime();

  const batchHealth: ImportBatchHealth[] = batches.map((b) => {
    const batchMs = new Date(b.createdAt).getTime();
    const ageDays = (nowMs - batchMs) / 86_400_000;

    let freshnessLabel: ImportBatchHealth['freshnessLabel'];
    if (ageDays < 1) freshnessLabel = 'today';
    else if (ageDays < 7) freshnessLabel = 'this-week';
    else if (ageDays < 31) freshnessLabel = 'this-month';
    else freshnessLabel = 'older';

    return {
      batchId: b.batchId,
      createdAt: b.createdAt,
      sourceType: b.sourceType,
      extractionMethod: b.extractionMethod,
      status: b.status,
      total: b.total,
      pending: b.pending,
      accepted: b.accepted,
      rejected: b.rejected,
      freshnessLabel,
    };
  });

  const allDates = batchHealth.map((b) => b.createdAt).sort();
  const pendingReviewCount = batchHealth.reduce((s, b) => s + b.pending, 0);
  const acceptedCount = batchHealth.reduce((s, b) => s + b.accepted, 0);
  const rejectedCount = batchHealth.reduce((s, b) => s + b.rejected, 0);

  // Summarize per source type
  const sourceTypeSummary: ImportHealthReport['sourceTypeSummary'] = {};
  for (const b of batchHealth) {
    const entry = sourceTypeSummary[b.sourceType] ?? { batchCount: 0, transactionCount: 0, lastImport: null };
    entry.batchCount += 1;
    entry.transactionCount += b.total;
    if (!entry.lastImport || b.createdAt > entry.lastImport) entry.lastImport = b.createdAt;
    sourceTypeSummary[b.sourceType] = entry;
  }

  return {
    batches: batchHealth,
    pendingReviewCount,
    acceptedCount,
    rejectedCount,
    oldestBatchDate: allDates[0] ?? null,
    newestBatchDate: allDates[allDates.length - 1] ?? null,
    sourceTypeSummary,
  };
}
