import { assertMerchantNameSafe, assertChatPayloadSafe, sanitizeDocumentText } from '../privacy.js';
import type { AgentProvider, ExtractionInput, ExtractionResult, ChatEnhanceInput, ExtractedTransaction } from '../types.js';

const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';

const EXTRACTION_SYSTEM = `You are a financial data extraction assistant.
Extract transaction records from bank statement text and return ONLY valid JSON:
{
  "transactions": [{"date":"YYYY-MM-DD","processedDate":"YYYY-MM-DD","amount":-100.00,"originalAmount":-100.00,"originalCurrency":"ILS","description":"string","status":"completed","confidenceScore":0.95,"warnings":[]}],
  "overallConfidence": 0.95,
  "documentWarnings": []
}
Rules: negative=debit, positive=credit, confidenceScore 0-1, add warnings for ambiguous fields.`;

const CHAT_ENHANCE_SYSTEM = `You present financial answers naturally. NEVER change numbers or dates. NEVER add information not in the local answer. Be concise.`;

/**
 * Anthropic (Claude) provider adapter.
 *
 * Uses raw fetch — no @anthropic-ai/sdk dependency. Justification: the SDK
 * adds ~2MB to the bundle and wraps the same HTTP endpoints we call here.
 * The Messages API surface we use is stable and minimal.
 */
export class AnthropicProvider implements AgentProvider {
  readonly type = 'anthropic' as const;
  readonly isLocal = false;
  readonly model: string;

  constructor(
    private readonly apiKey: string,
    model = 'claude-3-haiku-20240307',
  ) {
    this.model = model;
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      // Anthropic doesn't have a /models list endpoint; send a minimal message
      const res = await this.callApi({
        model: this.model,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'hi' }],
      });
      return { ok: res != null };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  }

  async extractDocument(input: ExtractionInput): Promise<ExtractionResult | null> {
    const safeText = sanitizeDocumentText(input.documentText);
    const userContent = [
      input.hint ? `Document type: ${input.hint}` : '',
      input.defaultCurrency ? `Default currency: ${input.defaultCurrency}` : '',
      `Document text:\n${safeText}`,
    ].filter(Boolean).join('\n');

    const raw = await this.message(EXTRACTION_SYSTEM, userContent);
    return parseExtractionResponse(raw);
  }

  async enhanceChatAnswer(input: ChatEnhanceInput): Promise<string> {
    assertChatPayloadSafe(input.question, input.localAnswer);
    return this.message(CHAT_ENHANCE_SYSTEM, `Question: ${input.question}\n\nLocal answer:\n${input.localAnswer}`);
  }

  async suggestMerchantCategory(merchantName: string): Promise<string | null> {
    assertMerchantNameSafe(merchantName);
    const result = await this.message(
      'Reply with ONLY one category word: groceries, dining, transport, health, utilities, entertainment, shopping, education, banking, savings, income, transfer, or other.',
      `Merchant: "${merchantName}"`,
    );
    return sanitizeCategory(result);
  }

  private async message(systemPrompt: string, userContent: string): Promise<string> {
    const data = await this.callApi({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });
    const block = data.content[0];
    return block?.type === 'text' ? (block.text as string).trim() : '';
  }

  private async callApi(body: object): Promise<{
    content: Array<{ type: string; text?: string }>;
  }> {
    const res = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(`Anthropic API error: ${err.error?.message ?? res.status}`);
    }
    return res.json() as Promise<{ content: Array<{ type: string; text?: string }> }>;
  }
}

function parseExtractionResponse(raw: string): ExtractionResult | null {
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned) as {
      transactions: ExtractedTransaction[];
      overallConfidence: number;
      documentWarnings: string[];
    };
    return {
      transactions: (parsed.transactions ?? []).map((t) => ({
        ...t,
        amount: Number(t.amount),
        originalAmount: Number(t.originalAmount ?? t.amount),
        confidenceScore: Math.max(0, Math.min(1, Number(t.confidenceScore ?? 0.7))),
        warnings: t.warnings ?? [],
      })),
      overallConfidence: Number(parsed.overallConfidence ?? 0.5),
      documentWarnings: parsed.documentWarnings ?? [],
    };
  } catch {
    return null;
  }
}

const VALID_CATEGORIES = new Set([
  'groceries', 'dining', 'transport', 'health', 'utilities',
  'entertainment', 'shopping', 'education', 'banking', 'savings',
  'income', 'transfer', 'other',
]);

function sanitizeCategory(raw: string): string | null {
  const cleaned = raw.toLowerCase().trim().replace(/[^a-z]/g, '');
  return VALID_CATEGORIES.has(cleaned) ? cleaned : null;
}
