/**
 * Secret redaction utilities for logs and error messages.
 *
 * Ensures that secret values never appear in observable output, even when
 * code paths accidentally include them in error messages or debug output.
 *
 * Usage:
 *   logger.error(redactSecrets(err.message, [apiKey, password]));
 *   console.error(formatError(err, { secrets: [apiKey] }));
 */

/**
 * Replace all occurrences of each secret in `text` with [REDACTED].
 * Short secrets (< 4 chars) are not considered because they would redact
 * too aggressively (e.g. common words). Real secrets are always longer.
 */
export function redactSecrets(text: string, secrets: Array<string | null | undefined>): string {
  let result = text;
  for (const secret of secrets) {
    if (!secret || secret.length < 4) continue;
    // Escape for regex
    const escaped = secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), '[REDACTED]');
  }
  return result;
}

/**
 * Format an error message safely, redacting any secret values.
 * Use this whenever building an error string that might be logged.
 */
export function formatError(
  err: unknown,
  opts?: { secrets?: Array<string | null | undefined>; prefix?: string },
): string {
  const base = err instanceof Error ? err.message : String(err);
  const prefixed = opts?.prefix ? `${opts.prefix}: ${base}` : base;
  if (!opts?.secrets?.length) return prefixed;
  return redactSecrets(prefixed, opts.secrets);
}

/**
 * Wrap a value in a marker so it appears as [secret] in JSON.stringify output.
 * Use when building objects that may be logged.
 */
export function markSecret<T>(value: T): { toString: () => string; toJSON: () => string } {
  return {
    toString: () => '[secret]',
    toJSON: () => '[secret]',
  };
}
