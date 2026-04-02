import { assertMerchantNameSafe, assertChatPayloadSafe, sanitizeDocumentText } from '../privacy.js';
import type { AgentProvider, ExtractionInput, ExtractionResult, ChatEnhanceInput, ExtractedTransaction } from '../types.js';

const OPENAI_API_BASE = 'https://api.openai.com/v1';

const EXTRACTION_SYSTEM_PROMPT = `You are a financial data extraction assistant.
Extract transaction records from the provided bank statement or financial document text.
Return ONLY a valid JSON object with this exact shape:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "processedDate": "YYYY-MM-DD",
      "amount": -100.00,
      "originalAmount": -100.00,
      "originalCurrency": "ILS",
      "description": "merchant or payee name",
      "status": "completed",
      "confidenceScore": 0.95,
      "warnings": []
    }
  ],
  "overallConfidence": 0.95,
  "documentWarnings": []
}
Rules:
- Negative amounts = expenses/debits, positive = income/credits
- confidenceScore: 0.0–1.0 per transaction (use <0.7 for ambiguous values)
- warnings: [{field, message, severity}] where severity is "info"|"warning"|"error"
- Do not invent data. If a field is unclear, add a warning and use your best guess.
- Return ONLY the JSON. No explanation text.`;

const CHAT_ENHANCE_SYSTEM_PROMPT = `You are a helpful financial assistant. 
The user asked a question and a local system already computed a grounded answer from their financial data.
Your job is to present that answer more naturally in plain English.
IMPORTANT RULES:
- Do NOT change any numbers, amounts, or dates in the answer
- Do NOT add information not present in the local answer
- Keep it concise and friendly
- Respond in the same language as the user's question
- If the local answer says "No data found", do not invent data`;

/**
 * OpenAI provider adapter.
 *
 * Uses raw fetch — no SDK dependency required. Justification: adding the
 * full openai npm package (~500KB) is unjustified for the small subset of
 * endpoints we use (chat completions only). The API surface we need is stable.
 */
export class OpenAIProvider implements AgentProvider {
  readonly type = 'openai' as const;
  readonly isLocal = false;
  readonly model: string;

  constructor(
    private readonly apiKey: string,
    model = 'gpt-4o-mini',
  ) {
    this.model = model;
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${OPENAI_API_BASE}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
        return { ok: false, error: body.error?.message ?? `HTTP ${res.status}` };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  }

  async extractDocument(input: ExtractionInput): Promise<ExtractionResult | null> {
    const safeText = sanitizeDocumentText(input.documentText);
    const userContent = [
      input.hint ? `Document type: ${input.hint}` : '',
      input.defaultCurrency ? `Default currency: ${input.defaultCurrency}` : '',
      `\nDocument text:\n${safeText}`,
    ].filter(Boolean).join('\n');

    const raw = await this.complete(EXTRACTION_SYSTEM_PROMPT, userContent);
    return parseExtractionResponse(raw);
  }

  async enhanceChatAnswer(input: ChatEnhanceInput): Promise<string> {
    assertChatPayloadSafe(input.question, input.localAnswer);
    const userContent = `Question: ${input.question}\n\nLocal answer:\n${input.localAnswer}`;
    return this.complete(CHAT_ENHANCE_SYSTEM_PROMPT, userContent);
  }

  async suggestMerchantCategory(merchantName: string): Promise<string | null> {
    assertMerchantNameSafe(merchantName);
    const prompt = `Classify this merchant name into exactly one category: groceries, dining, transport, health, utilities, entertainment, shopping, education, banking, savings, income, transfer, or other. Reply with ONLY the category word. Merchant: "${merchantName}"`;
    const result = await this.complete('You are a merchant categorization assistant. Reply with only the category name.', prompt);
    return sanitizeCategory(result);
  }

  private async complete(systemPrompt: string, userContent: string): Promise<string> {
    const res = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(`OpenAI API error: ${err.error?.message ?? res.status}`);
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message.content.trim() ?? '';
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseExtractionResponse(raw: string): ExtractionResult | null {
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned) as {
      transactions: ExtractedTransaction[];
      overallConfidence: number;
      documentWarnings: string[];
    };
    return {
      transactions: (parsed.transactions ?? []).map(normalizeExtracted),
      overallConfidence: Number(parsed.overallConfidence ?? 0.5),
      documentWarnings: parsed.documentWarnings ?? [],
    };
  } catch {
    return null;
  }
}

function normalizeExtracted(t: ExtractedTransaction): ExtractedTransaction {
  return {
    ...t,
    amount: Number(t.amount),
    originalAmount: Number(t.originalAmount ?? t.amount),
    confidenceScore: Math.max(0, Math.min(1, Number(t.confidenceScore ?? 0.7))),
    warnings: t.warnings ?? [],
  };
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
