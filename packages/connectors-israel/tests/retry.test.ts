import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../src/retry.js';
import type { ImportResult } from '../src/connector.js';

const successResult: ImportResult = {
  status: 'success',
  accounts: [],
  transactions: [],
  durationMs: 1,
};

const networkError: ImportResult = {
  status: 'error',
  errorKind: 'network',
  message: 'Navigation timeout',
  durationMs: 1,
};

const authError: ImportResult = {
  status: 'error',
  errorKind: 'auth',
  message: 'Invalid credentials',
  durationMs: 1,
};

describe('withRetry', () => {
  it('returns immediately on first success', async () => {
    const fn = vi.fn(async (): Promise<ImportResult> => successResult);
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 0 });
    expect(result.status).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries network errors up to maxAttempts', async () => {
    const fn = vi.fn(async (): Promise<ImportResult> => networkError);
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 0 });
    expect(result.status).toBe('error');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('never retries auth errors', async () => {
    const fn = vi.fn(async (): Promise<ImportResult> => authError);
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 0 });
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.errorKind).toBe('auth');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('succeeds on second attempt after initial failure', async () => {
    let calls = 0;
    const fn = vi.fn(async (): Promise<ImportResult> => {
      calls++;
      return calls < 2 ? networkError : successResult;
    });
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 0 });
    expect(result.status).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('returns last error after exhausting all attempts', async () => {
    const fn = vi.fn(async (): Promise<ImportResult> => networkError);
    const result = await withRetry(fn, { maxAttempts: 2, baseDelayMs: 0 });
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.errorKind).toBe('network');
    }
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
