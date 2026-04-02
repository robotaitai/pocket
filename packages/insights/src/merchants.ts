import type { Transaction } from '@pocket/core-model';
import type { MerchantSummary } from './types.js';

/** Days within which a merchant is considered "new". */
const NEW_MERCHANT_DAYS = 30;

/**
 * Build merchant spend summaries from accepted transactions.
 * Only includes expenses (amount < 0).
 */
export function buildMerchantSummaries(
  transactions: Transaction[],
  referenceDate?: string,
): MerchantSummary[] {
  const ref = referenceDate ?? new Date().toISOString().slice(0, 10);
  const refMs = new Date(ref).getTime();

  const groups = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (t.amount >= 0) continue;
    const existing = groups.get(t.description);
    if (existing) existing.push(t); else groups.set(t.description, [t]);
  }

  // We need to know which merchants existed *before* the reference period to determine "new"
  // Simple heuristic: if ALL transactions for this merchant fall within the last NEW_MERCHANT_DAYS
  // from referenceDate, it is considered new.
  const summaries: MerchantSummary[] = [];

  for (const [description, txns] of groups) {
    const total = txns.reduce((s, t) => s + t.amount, 0);
    const avgAmount = total / txns.length;
    const dates = txns.map((t) => t.date).sort();
    const lastSeen = dates[dates.length - 1]!;
    const firstSeen = dates[0]!;
    const firstSeenMs = new Date(firstSeen).getTime();
    const isNew = refMs - firstSeenMs <= NEW_MERCHANT_DAYS * 86_400_000;

    const effectiveCategory = txns.find((t) => t.category)?.category ?? null;
    const isSuspicious = !effectiveCategory && Math.abs(avgAmount) > 200;

    summaries.push({
      description,
      effectiveCategory,
      transactionCount: txns.length,
      total: round2(total),
      avgAmount: round2(avgAmount),
      lastSeen,
      isNew,
      isSuspicious,
    });
  }

  // Sort by total spend ascending (most spent = most negative)
  return summaries.sort((a, b) => a.total - b.total);
}

/** Returns merchants that are flagged new or suspicious. */
export function findNewAndSuspiciousMerchants(
  transactions: Transaction[],
  referenceDate?: string,
): MerchantSummary[] {
  return buildMerchantSummaries(transactions, referenceDate)
    .filter((m) => m.isNew || m.isSuspicious);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
