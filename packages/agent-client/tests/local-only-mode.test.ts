import { describe, it, expect } from 'vitest';
import { LocalOnlyProvider } from '../src/providers/local.js';
import { createProvider } from '../src/factory.js';

/**
 * Local-only mode guarantee tests.
 * These ensure the app remains fully functional with no provider configured.
 */
describe('local-only mode guarantees', () => {
  it('createProvider with no key produces a local provider', () => {
    const p = createProvider({ providerType: 'openai' });
    expect(p.isLocal).toBe(true);
  });

  it('local provider never makes network calls (extractDocument returns null)', async () => {
    const p = new LocalOnlyProvider();
    // Should complete instantly with no network activity
    const result = await p.extractDocument({
      documentText: 'Date 2026-01-01 Amount -100 Description Coffee',
    });
    expect(result).toBeNull();
  });

  it('local provider chat enhancement is a pass-through', async () => {
    const p = new LocalOnlyProvider();
    const localAnswer = 'Spent ₪1,530 on expenses in March 2026';
    const result = await p.enhanceChatAnswer({
      question: 'How much did I spend in March?',
      localAnswer,
    });
    expect(result).toBe(localAnswer);
  });

  it('local provider merchant suggestion returns null (not an error)', async () => {
    const p = new LocalOnlyProvider();
    const result = await p.suggestMerchantCategory('Supersol');
    expect(result).toBeNull();
  });

  it('local provider test connection always returns ok=true', async () => {
    const p = new LocalOnlyProvider();
    const result = await p.testConnection();
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
