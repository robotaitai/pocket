import type { AgentProvider, ExtractionInput, ExtractionResult, ChatEnhanceInput } from '../types.js';

/**
 * LocalOnlyProvider — the default provider when no external API key is configured.
 *
 * All methods return safe no-op results. The app remains fully usable in local-only mode.
 * Document extraction is not available (returns null).
 * Chat answers are returned unmodified.
 * Merchant suggestions return null.
 */
export class LocalOnlyProvider implements AgentProvider {
  readonly type = 'local' as const;
  readonly isLocal = true;

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    return { ok: true };
  }

  async extractDocument(_input: ExtractionInput): Promise<ExtractionResult | null> {
    // Local-only mode: PDF/unstructured extraction not available
    return null;
  }

  async enhanceChatAnswer(input: ChatEnhanceInput): Promise<string> {
    // Return the local answer unmodified — no enhancement in local mode
    return input.localAnswer;
  }

  async suggestMerchantCategory(_merchantName: string): Promise<string | null> {
    return null;
  }
}
