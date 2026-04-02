import type { DateRange } from './types.js';

/** Returns the start/end of the current calendar month (UTC). */
export function currentMonth(): DateRange {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: toDate(start), end: toDate(end) };
}

/** Returns the start/end of the previous calendar month. */
export function lastMonth(): DateRange {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { start: toDate(start), end: toDate(end) };
}

/** Returns a range starting N calendar months ago (inclusive) to today. */
export function lastNMonths(n: number): DateRange {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: toDate(start), end: toDate(end) };
}

/** Returns YYYY-MM from a DateRange start. */
export function rangeLabel(range: DateRange): string {
  return range.start.slice(0, 7);
}

function toDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Parse a human-readable period token into a DateRange. */
export function parsePeriodToken(token: string): DateRange | null {
  const lower = token.toLowerCase().trim();
  if (lower === 'this month') return currentMonth();
  if (lower === 'last month') return lastMonth();
  const mMatch = lower.match(/^last (\d+) months?$/);
  if (mMatch) return lastNMonths(Number(mMatch[1]));
  return null;
}
