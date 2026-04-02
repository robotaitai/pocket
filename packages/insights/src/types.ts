import type { Transaction } from '@pocket/core-model';

export interface DateRange {
  start: string; // ISO date YYYY-MM-DD
  end: string;   // ISO date YYYY-MM-DD (exclusive)
}

export interface PeriodSummary {
  period: DateRange;
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
  currency: string;
  hasLowConfidenceData: boolean;
}

export interface MerchantSummary {
  description: string;
  effectiveCategory: string | null;
  transactionCount: number;
  total: number;       // negative = expense (sum of negative amounts)
  avgAmount: number;
  lastSeen: string;
  isNew: boolean;      // first seen within the last 30 days
  isSuspicious: boolean; // untagged AND amount is above average
}

export type RecurringPeriod = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'irregular';

export interface RecurringPayment {
  description: string;
  effectiveCategory: string | null;
  estimatedAmount: number;
  period: RecurringPeriod;
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
  nextExpectedDate: string | null;
  confidence: number; // 0-1: how regular the interval is
}

export interface ImportHealthReport {
  batches: ImportBatchHealth[];
  pendingReviewCount: number;
  acceptedCount: number;
  rejectedCount: number;
  oldestBatchDate: string | null;
  newestBatchDate: string | null;
  sourceTypeSummary: Record<string, { batchCount: number; transactionCount: number; lastImport: string | null }>;
}

export interface ImportBatchHealth {
  batchId: string;
  createdAt: string;
  sourceType: string;
  extractionMethod: string;
  status: string;
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  freshnessLabel: 'today' | 'this-week' | 'this-month' | 'older';
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export type ChatIntent =
  | 'period_summary'
  | 'category_spend'
  | 'recurring_list'
  | 'period_comparison'
  | 'new_merchants'
  | 'merchant_history'
  | 'largest_expenses'
  | 'top_merchants'
  | 'income_summary'
  | 'unknown';

export interface ChatQueryPlan {
  intent: ChatIntent;
  params: Record<string, string | number | null>;
  humanReadable: string; // what the system understood
}

export interface ChatSource {
  transactionId?: string;
  description: string;
  date: string;
  amount: number;
  currency: string;
  importBatchId?: string;
}

export interface ChatAnswer {
  text: string;
  sources: ChatSource[];
  uncertainty: string | null;
  queryPlan: ChatQueryPlan;
}

// ── Export ────────────────────────────────────────────────────────────────────

export interface ExportFilter {
  startDate?: string;
  endDate?: string;
  category?: string;
  reviewStatus?: 'accepted' | 'pending' | 'rejected' | 'all';
  minAmount?: number;
  maxAmount?: number;
}

export type { Transaction };
