import type { Transaction } from '@pocket/core-model';
import type { DateRange, PeriodSummary } from './types.js';

/**
 * Compute income / expense / net for a set of accepted transactions.
 * Caller is responsible for pre-filtering to the desired date range.
 */
export function summarizePeriod(
  transactions: Transaction[],
  period: DateRange,
  currency = 'ILS',
): PeriodSummary {
  let income = 0;
  let expenses = 0;
  let hasLowConfidence = false;

  for (const t of transactions) {
    if (t.amount > 0) {
      income += t.amount;
    } else {
      expenses += Math.abs(t.amount);
    }
    if (t.confidenceScore !== undefined && t.confidenceScore !== null && t.confidenceScore < 0.7) {
      hasLowConfidence = true;
    }
  }

  return {
    period,
    income: round2(income),
    expenses: round2(expenses),
    net: round2(income - expenses),
    transactionCount: transactions.length,
    currency,
    hasLowConfidenceData: hasLowConfidence,
  };
}

/**
 * Compare two period summaries. Returns % change in each metric (null if division by zero).
 */
export interface PeriodComparison {
  current: PeriodSummary;
  previous: PeriodSummary;
  incomeChange: number | null;
  expenseChange: number | null;
  netChange: number | null;
}

export function comparePeriods(current: PeriodSummary, previous: PeriodSummary): PeriodComparison {
  return {
    current,
    previous,
    incomeChange: pctChange(previous.income, current.income),
    expenseChange: pctChange(previous.expenses, current.expenses),
    netChange: pctChange(previous.net, current.net),
  };
}

function pctChange(prev: number, curr: number): number | null {
  if (prev === 0) return null;
  return round2(((curr - prev) / Math.abs(prev)) * 100);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
