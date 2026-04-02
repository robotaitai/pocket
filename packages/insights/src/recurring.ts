import type { Transaction } from '@pocket/core-model';
import type { RecurringPayment, RecurringPeriod } from './types.js';

const MIN_OCCURRENCES = 2;

/**
 * Detect recurring payments from a list of accepted transactions.
 * Groups by normalized description, then analyzes inter-transaction intervals.
 */
export function detectRecurring(transactions: Transaction[]): RecurringPayment[] {
  const expenses = transactions.filter((t) => t.amount < 0);

  // Group by normalized description
  const groups = new Map<string, Transaction[]>();
  for (const t of expenses) {
    const key = normalize(t.description);
    const existing = groups.get(key);
    if (existing) {
      existing.push(t);
    } else {
      groups.set(key, [t]);
    }
  }

  const results: RecurringPayment[] = [];

  for (const [, txns] of groups) {
    if (txns.length < MIN_OCCURRENCES) continue;

    const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date));
    const intervals = computeIntervals(sorted);
    const medianInterval = median(intervals);

    const period = classifyPeriod(medianInterval);
    const confidence = computeConfidence(intervals, medianInterval);
    const amounts = sorted.map((t) => Math.abs(t.amount));
    const estimatedAmount = round2(median(amounts));
    const lastTxn = sorted[sorted.length - 1]!;
    const firstTxn = sorted[0]!;

    const nextExpectedDate = medianInterval > 0
      ? addDays(lastTxn.date, Math.round(medianInterval))
      : null;

    results.push({
      description: firstTxn.description,
      effectiveCategory: firstTxn.category ?? null,
      estimatedAmount,
      period,
      occurrenceCount: sorted.length,
      firstSeen: firstTxn.date,
      lastSeen: lastTxn.date,
      nextExpectedDate,
      confidence,
    });
  }

  // Sort by confidence desc, then by estimatedAmount desc
  return results.sort((a, b) => b.confidence - a.confidence || b.estimatedAmount - a.estimatedAmount);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(description: string): string {
  return description.toLowerCase().trim().replace(/\s+/g, ' ');
}

function computeIntervals(sorted: Transaction[]): number[] {
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    const days = dateDiffDays(prev.date, curr.date);
    intervals.push(days);
  }
  return intervals;
}

function classifyPeriod(medianDays: number): RecurringPeriod {
  if (medianDays <= 0) return 'irregular';
  if (medianDays <= 9) return 'weekly';
  if (medianDays <= 18) return 'biweekly';
  if (medianDays <= 35) return 'monthly';
  if (medianDays <= 100) return 'quarterly';
  return 'irregular';
}

/** How consistent are the intervals? 1 = perfectly regular, 0 = completely irregular. */
function computeConfidence(intervals: number[], med: number): number {
  if (intervals.length === 0 || med === 0) return 0;
  const deviations = intervals.map((i) => Math.abs(i - med) / med);
  const avgDeviation = deviations.reduce((s, d) => s + d, 0) / deviations.length;
  return round2(Math.max(0, 1 - avgDeviation));
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function dateDiffDays(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000;
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
