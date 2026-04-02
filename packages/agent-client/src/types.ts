import type { RawImportRecord, Warning } from '@pocket/core-model';

// ── Provider identity ─────────────────────────────────────────────────────────

export type ProviderType = 'openai' | 'anthropic' | 'gemini' | 'local';

export type AgentMode = 'local' | 'connected';

export interface ProviderConfig {
  mode: AgentMode;
  providerType: ProviderType;
  /** Whether to allow the provider to enhance chat answers (default: true when connected). */
  chatEnhancementEnabled: boolean;
  /** Whether to allow merchant category suggestions via provider (default: true when connected). */
  merchantSuggestionsEnabled: boolean;
}

export const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  mode: 'local',
  providerType: 'local',
  chatEnhancementEnabled: false,
  merchantSuggestionsEnabled: false,
};

// ── Provider interface ────────────────────────────────────────────────────────

/**
 * Privacy-safe extraction input.
 *
 * ALLOWED: document text content that the user explicitly chose to import.
 * FORBIDDEN: account IDs, balances, existing transaction data from the DB.
 */
export interface ExtractionInput {
  /** Raw text extracted from the document (PDF text layer, CSV rows, etc.). */
  documentText: string;
  /**
   * Raw file bytes as a base64 string. When provided and the provider supports
   * native document understanding (e.g. Gemini multimodal), the binary is sent
   * directly and the model reads the document without relying on our text extraction.
   * This is required for font-encoded PDFs where the text layer is inaccessible.
   */
  rawBytesBase64?: string;
  /** MIME type of the raw bytes, e.g. 'application/pdf'. */
  rawMimeType?: string;
  /** Human-readable hint about the document type / institution, if known. */
  hint?: string;
  /** Suggested currency for amounts found without explicit currency markers. */
  defaultCurrency?: string;
}

export interface ExtractedTransaction {
  date: string;
  processedDate?: string;
  amount: number;
  originalAmount: number;
  originalCurrency: string;
  description: string;
  memo?: string;
  status?: 'completed' | 'pending';
  referenceId?: string;
  confidenceScore: number;
  warnings: Warning[];
}

export interface ExtractionResult {
  transactions: ExtractedTransaction[];
  /** Overall confidence for the whole document (0-1). */
  overallConfidence: number;
  /** Any document-level issues detected. */
  documentWarnings: string[];
}

/**
 * Privacy-safe chat enhancement input.
 *
 * ALLOWED: the user's question and a pre-formatted local answer (text only).
 * FORBIDDEN: transaction IDs, account IDs, raw amounts from DB queries.
 */
export interface ChatEnhanceInput {
  question: string;
  /** The answer already produced by the local grounded query engine. */
  localAnswer: string;
}

// ── Provider contract ─────────────────────────────────────────────────────────

export interface AgentProvider {
  readonly type: ProviderType;
  /** True for the local no-op provider, false for all external providers. */
  readonly isLocal: boolean;

  /**
   * Test that the provider key is valid and the service is reachable.
   * Must not send any user financial data.
   */
  testConnection(): Promise<{ ok: boolean; error?: string }>;

  /**
   * Extract structured transaction data from document text.
   * Returns null in local-only mode or when extraction is not supported.
   *
   * Privacy: only `documentText` (what the user chose to import) is sent.
   * No DB data, account IDs, or balances are included in the payload.
   */
  extractDocument(input: ExtractionInput): Promise<ExtractionResult | null>;

  /**
   * Optionally enhance a locally-grounded chat answer.
   * Must return `localAnswer` unchanged when enhancement is not supported.
   *
   * Privacy: only `question` and the formatted `localAnswer` string are sent.
   * No transaction IDs, account IDs, or raw DB results.
   */
  enhanceChatAnswer(input: ChatEnhanceInput): Promise<string>;

  /**
   * Suggest a category for a merchant name.
   * Returns null when not supported or merchant is unknown.
   *
   * Privacy: ONLY the merchant name string is sent. No amounts, dates, or accounts.
   */
  suggestMerchantCategory(merchantName: string): Promise<string | null>;
}

// ── Extraction-to-import bridge ───────────────────────────────────────────────

/**
 * Converts an ExtractedTransaction into a RawImportRecord for the normalization pipeline.
 * The caller must supply accountId and batch metadata.
 */
export function toRawImportRecord(
  t: ExtractedTransaction,
  opts: {
    accountId: string;
    sourceType: 'pdf' | 'xlsx' | 'csv';
    sourceFile: string;
    providerType: string;
  },
): RawImportRecord {
  return {
    sourceType: opts.sourceType,
    extractionMethod: 'agent',
    providerUsed: opts.providerType,
    sourceFile: opts.sourceFile,
    accountId: opts.accountId,
    date: t.date,
    processedDate: t.processedDate,
    amount: t.amount,
    originalAmount: t.originalAmount,
    originalCurrency: t.originalCurrency,
    description: t.description,
    memo: t.memo,
    status: t.status ?? 'completed',
    referenceId: t.referenceId,
    confidenceScore: t.confidenceScore,
    warnings: t.warnings,
  };
}
