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

export function onlyMonth(monthKey: string): DateRange {
  const { year, month } = parseMonthKey(monthKey);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start: toDate(start), end: toDate(end) };
}

export function sinceMonth(monthKey: string): DateRange {
  const { year, month } = parseMonthKey(monthKey);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const now = new Date();
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
  if (mMatch?.[1]) return lastNMonths(Number(mMatch[1]));
  const onlyMatch = lower.match(/^only (\d{4}-\d{2})$/);
  if (onlyMatch?.[1]) return onlyMonth(onlyMatch[1]);
  const sinceMatch = lower.match(/^since (\d{4}-\d{2})$/);
  if (sinceMatch?.[1]) return sinceMonth(sinceMatch[1]);
  return null;
}

function parseMonthKey(monthKey: string): { year: number; month: number } {
  const parts = monthKey.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }
  return { year, month };
}
