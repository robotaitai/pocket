import { describe, it, expect } from 'vitest';
import { buildImportHealthReport } from '../src/import-health.js';
import type { RawBatchRow } from '../src/import-health.js';

const now = new Date().toISOString();

const batches: RawBatchRow[] = [
  { batchId: 'b1', createdAt: now, sourceType: 'scraper', extractionMethod: 'scraper', status: 'success', total: 5, pending: 2, accepted: 3, rejected: 0 },
  { batchId: 'b2', createdAt: '2026-03-01T00:00:00Z', sourceType: 'pdf', extractionMethod: 'agent', status: 'success', total: 3, pending: 0, accepted: 2, rejected: 1 },
];

describe('buildImportHealthReport', () => {
  it('sums pending, accepted, rejected counts', () => {
    const report = buildImportHealthReport(batches);
    expect(report.pendingReviewCount).toBe(2);
    expect(report.acceptedCount).toBe(5);
    expect(report.rejectedCount).toBe(1);
  });

  it('returns empty report for no batches', () => {
    const report = buildImportHealthReport([]);
    expect(report.batches).toHaveLength(0);
    expect(report.pendingReviewCount).toBe(0);
    expect(report.oldestBatchDate).toBeNull();
  });

  it('labels today batch as "today"', () => {
    const report = buildImportHealthReport(batches);
    const todayBatch = report.batches.find((b) => b.batchId === 'b1');
    expect(todayBatch!.freshnessLabel).toBe('today');
  });

  it('labels old batch as "older"', () => {
    const report = buildImportHealthReport(batches);
    const oldBatch = report.batches.find((b) => b.batchId === 'b2');
    expect(oldBatch!.freshnessLabel).toBe('older');
  });

  it('groups by source type', () => {
    const report = buildImportHealthReport(batches);
    expect(report.sourceTypeSummary['scraper']!.batchCount).toBe(1);
    expect(report.sourceTypeSummary['pdf']!.batchCount).toBe(1);
    expect(report.sourceTypeSummary['scraper']!.transactionCount).toBe(5);
  });

  it('sets newestBatchDate and oldestBatchDate', () => {
    const report = buildImportHealthReport(batches);
    expect(report.oldestBatchDate).toBe('2026-03-01T00:00:00Z');
    expect(report.newestBatchDate).toBe(now);
  });
});
