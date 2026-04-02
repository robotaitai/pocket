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
}

declare global {
  interface Window {
    pocket: PocketApi;
  }
}
