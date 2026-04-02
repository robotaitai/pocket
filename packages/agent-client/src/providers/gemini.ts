import { assertMerchantNameSafe, assertChatPayloadSafe, sanitizeDocumentText } from '../privacy.js';
import type { AgentProvider, ExtractionInput, ExtractionResult, ChatEnhanceInput, ExtractedTransaction } from '../types.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const EXTRACTION_PROMPT_PREFIX = `Extract transaction records from this bank statement text and return ONLY valid JSON:
{"transactions":[{"date":"YYYY-MM-DD","processedDate":"YYYY-MM-DD","amount":-100.00,"originalAmount":-100.00,"originalCurrency":"ILS","description":"string","status":"completed","confidenceScore":0.95,"warnings":[]}],"overallConfidence":0.95,"documentWarnings":[]}
Rules: negative=debit, positive=credit. Add warnings for ambiguous fields. Return ONLY JSON.

Document text:
`;

/**
 * Google Gemini provider adapter.
 *
 * Uses raw fetch — no @google/generative-ai SDK dependency. Justification:
 * the SDK adds ~1MB and wraps the same generateContent endpoint we call here.
 */
export class GeminiProvider implements AgentProvider {
  readonly type = 'gemini' as const;
  readonly isLocal = false;
  readonly model: string;

  constructor(
    private readonly apiKey: string,
    model = 'gemini-1.5-flash',
  ) {
    this.model = model;
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${GEMINI_API_BASE}/models?key=${this.apiKey}`);
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  }

  async extractDocument(input: ExtractionInput): Promise<ExtractionResult | null> {
    const safeText = sanitizeDocumentText(input.documentText);
    const prompt = [
      EXTRACTION_PROMPT_PREFIX,
      input.hint ? `(Document type: ${input.hint})` : '',
      input.defaultCurrency ? `(Default currency: ${input.defaultCurrency})` : '',
      safeText,
    ].join('\n');

    const raw = await this.generate(prompt);
    return parseExtractionResponse(raw);
  }

  async enhanceChatAnswer(input: ChatEnhanceInput): Promise<string> {
    assertChatPayloadSafe(input.question, input.localAnswer);
    const prompt = `Present this financial answer naturally. DO NOT change any numbers or dates. DO NOT add information not present. Be concise.\n\nQuestion: ${input.question}\n\nAnswer to present:\n${input.localAnswer}`;
    return this.generate(prompt);
  }

  async suggestMerchantCategory(merchantName: string): Promise<string | null> {
    assertMerchantNameSafe(merchantName);
    const prompt = `Classify this merchant into one word: groceries, dining, transport, health, utilities, entertainment, shopping, education, banking, savings, income, transfer, or other. Reply with ONLY the category word. Merchant: "${merchantName}"`;
    const result = await this.generate(prompt);
    return sanitizeCategory(result);
  }

  private async generate(prompt: string): Promise<string> {
    const res = await fetch(`${GEMINI_API_BASE}/models/${this.model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
      }),
    });
    if (!res.ok) {
      throw new Error(`Gemini API error: HTTP ${res.status}`);
    }
    const data = await res.json() as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };
    return data.candidates[0]?.content.parts[0]?.text?.trim() ?? '';
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
