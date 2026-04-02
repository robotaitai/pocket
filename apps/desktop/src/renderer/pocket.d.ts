/**
 * Type declarations for the API exposed by the preload script via contextBridge.
 * This file is a module (has exports), so global augmentation uses `declare global`.
 */

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
  effectiveCategory: string | null;
  reviewStatus: ReviewStatus;
  reviewedAt: string | null;
  sourceType: string;
  extractionMethod: string;
  importBatchId: string;
  providerUsed: string | null;
  sourceFile: string | null;
  confidenceScore: number | null;
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

export interface MerchantRule {
  id: string;
  pattern: string;
  category: string;
  matchCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PeriodSummary {
  period: { start: string; end: string };
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
  currency: string;
  hasLowConfidenceData: boolean;
}

export interface RecurringPayment {
  description: string;
  effectiveCategory: string | null;
  estimatedAmount: number;
  period: string;
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
  nextExpectedDate: string | null;
  confidence: number;
}

export interface MerchantSummary {
  description: string;
  effectiveCategory: string | null;
  transactionCount: number;
  total: number;
  avgAmount: number;
  lastSeen: string;
  isNew: boolean;
  isSuspicious: boolean;
}

export interface ImportHealthReport {
  batches: Array<{
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
  }>;
  pendingReviewCount: number;
  acceptedCount: number;
  rejectedCount: number;
  oldestBatchDate: string | null;
  newestBatchDate: string | null;
  sourceTypeSummary: Record<string, { batchCount: number; transactionCount: number; lastImport: string | null }>;
}

export interface ChatAnswer {
  text: string;
  sources: Array<{
    transactionId?: string;
    description: string;
    date: string;
    amount: number;
    currency: string;
    importBatchId?: string;
  }>;
  uncertainty: string | null;
  queryPlan: { intent: string; params: Record<string, unknown>; humanReadable: string };
}

export interface SearchFilter {
  query?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  reviewStatus?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  reason?: string;
}

export interface TransactionRow {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  originalCurrency: string;
  category?: string;
  sourceType: string;
  importBatchId: string;
  confidenceScore?: number;
  warnings: unknown[];
}

export interface PocketApi {
  settings: {
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string): Promise<void>;
  };
  secrets: {
    get(account: string): Promise<string | null>;
    set(account: string, secret: string): Promise<void>;
    delete(account: string): Promise<void>;
  };
  review: {
    getBatches(): Promise<ReviewBatchSummary[]>;
    getTransactions(opts: { batchId?: string; reviewStatus?: ReviewStatus | 'all' }): Promise<ReviewTransaction[]>;
    accept(ids: string[]): Promise<void>;
    reject(ids: string[]): Promise<void>;
    setCategory(id: string, category: string, saveMerchantRule: boolean): Promise<void>;
    undo(): Promise<UndoResult>;
  };
  merchantRules: {
    getAll(): Promise<MerchantRule[]>;
    suggest(description: string): Promise<string | null>;
    delete(id: string): Promise<void>;
  };
  insights: {
    getSummary(periodKey: string): Promise<PeriodSummary>;
    getRecurring(): Promise<RecurringPayment[]>;
    getMerchants(limit: number): Promise<MerchantSummary[]>;
    getNewMerchants(): Promise<MerchantSummary[]>;
    search(filter: SearchFilter): Promise<TransactionRow[]>;
    getImportHealth(): Promise<ImportHealthReport>;
    chat(question: string): Promise<ChatAnswer>;
    export(filter: SearchFilter): Promise<ExportResult>;
  };
}

declare global {
  interface Window {
    pocket: PocketApi;
  }
}
