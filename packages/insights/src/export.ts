import type { Transaction } from '@pocket/core-model';

const CSV_HEADERS = [
  'Date',
  'Description',
  'Amount',
  'Currency',
  'Category',
  'Source Type',
  'Import Batch',
  'Review Status',
  'Confidence',
];

/**
 * Export transactions to a CSV string.
 * Caller is responsible for pre-filtering (period, category, review status, etc.).
 */
export function exportToCsv(transactions: Transaction[], reviewStatuses: Record<string, string> = {}): string {
  const rows: string[] = [CSV_HEADERS.join(',')];

  for (const t of transactions) {
    rows.push([
      csvCell(t.date.slice(0, 10)),
      csvCell(t.description),
      csvCell(String(t.amount)),
      csvCell(t.originalCurrency),
      csvCell(t.category ?? ''),
      csvCell(t.sourceType),
      csvCell(t.importBatchId),
      csvCell(reviewStatuses[t.id] ?? ''),
      csvCell(t.confidenceScore != null ? String(t.confidenceScore) : ''),
    ].join(','));
  }

  return rows.join('\n');
}

function csvCell(value: string): string {
  // Escape double-quotes; wrap in quotes if contains comma, newline, or quote
  const escaped = value.replace(/"/g, '""');
  if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
    return `"${escaped}"`;
  }
  return escaped;
}
