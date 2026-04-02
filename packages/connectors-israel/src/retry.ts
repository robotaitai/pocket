import type { ImportResult } from './connector.js';

export interface RetryOptions {
  maxAttempts: number;
  /** Base delay in ms; doubles each attempt. */
  baseDelayMs: number;
}

const DEFAULT_RETRY: RetryOptions = { maxAttempts: 3, baseDelayMs: 1000 };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs `fn` up to `maxAttempts` times with exponential backoff.
 * Auth errors are never retried — wrong credentials won't fix themselves.
 */
export async function withRetry(
  fn: () => Promise<ImportResult>,
  opts: RetryOptions = DEFAULT_RETRY,
): Promise<ImportResult> {
  let lastResult: ImportResult | undefined;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    const result = await fn();

    if (result.status === 'success') return result;
    if (result.errorKind === 'auth') return result; // never retry auth failures

    lastResult = result;

    if (attempt < opts.maxAttempts) {
      await sleep(opts.baseDelayMs * 2 ** (attempt - 1));
    }
  }

  return lastResult!;
}
