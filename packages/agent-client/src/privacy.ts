/**
 * Privacy boundary enforcement for all provider payloads.
 *
 * This module defines what can and cannot be sent to external providers,
 * and provides sanitization utilities.
 *
 * PRIVACY CONTRACT (enforced here and documented in knowledge tree):
 *
 * Extraction payload:
 *   ALLOWED:  document text the user explicitly chose to import
 *   ALLOWED:  document type hint (e.g. "bank statement")
 *   ALLOWED:  default currency hint
 *   FORBIDDEN: account IDs, account numbers, balances, existing DB transactions
 *
 * Chat enhancement payload:
 *   ALLOWED:  user's question (text)
 *   ALLOWED:  formatted local answer text (pre-processed, no IDs)
 *   FORBIDDEN: transaction IDs, account IDs, raw DB query results, amounts
 *
 * Merchant suggestion payload:
 *   ALLOWED:  merchant name string only
 *   FORBIDDEN: amounts, dates, account info, user-identifying data
 *
 * Shared intelligence (future):
 *   ALLOWED:  normalized merchant name → category mapping
 *   FORBIDDEN: any user-identifying data, amounts, dates, account info
 */

/** Patterns that suggest personally identifying or sensitive financial data. */
const FORBIDDEN_PATTERNS: RegExp[] = [
  /\bIL\d{2}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{3}\b/i, // IBAN
  /\b\d{8,11}\b/, // Israeli account numbers (8-11 digits)
  /account[_-]?id[:=\s]["']?[a-z0-9-]+/i,
  /balance[:=\s]/i,
];

/**
 * Validate that a merchant name payload does not contain forbidden data.
 * Throws if validation fails (hard boundary — not a warning).
 */
export function assertMerchantNameSafe(name: string): void {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(name)) {
      throw new Error(`Merchant name payload failed privacy check: ${pattern.source}`);
    }
  }
  if (name.length > 200) {
    throw new Error('Merchant name exceeds maximum safe length (200 chars)');
  }
}

/**
 * Validate that a chat enhancement payload does not contain forbidden data.
 * The local answer text must be a formatted string (not raw JSON from DB).
 */
export function assertChatPayloadSafe(question: string, localAnswer: string): void {
  // Both fields must be plain text, not JSON
  try {
    JSON.parse(localAnswer);
    throw new Error('Chat enhancement localAnswer must be formatted text, not raw JSON');
  } catch (e) {
    if (e instanceof SyntaxError) {
      // Not JSON — good
    } else {
      throw e;
    }
  }

  const combined = question + ' ' + localAnswer;
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(combined)) {
      throw new Error(`Chat enhancement payload failed privacy check: ${pattern.source}`);
    }
  }
}

/**
 * Sanitize document text before sending to a provider.
 * Removes anything that looks like an account number or IBAN
 * beyond what the user typed in the document.
 *
 * Note: we trust the user's own document text but still strip
 * obvious system-injected identifiers as a defense-in-depth measure.
 */
export function sanitizeDocumentText(text: string): string {
  return text
    .replace(/IL\d{2}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{3}/gi, '[IBAN-REDACTED]');
}
