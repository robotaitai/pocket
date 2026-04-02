import { describe, it, expect } from 'vitest';
import { LocalOnlyProvider } from '../src/providers/local.js';
import type { AgentProvider } from '../src/types.js';

function assertProviderContract(provider: AgentProvider): void {
  it('has a type property', () => { expect(typeof provider.type).toBe('string'); });
  it('has an isLocal property', () => { expect(typeof provider.isLocal).toBe('boolean'); });
  it('testConnection returns { ok: boolean }', async () => {
    const result = await provider.testConnection();
    expect(typeof result.ok).toBe('boolean');
  });
  it('extractDocument returns null or ExtractionResult', async () => {
    const result = await provider.extractDocument({ documentText: 'test' });
    expect(result === null || (typeof result === 'object' && Array.isArray(result.transactions))).toBe(true);
  });
  it('enhanceChatAnswer returns a string', async () => {
    const result = await provider.enhanceChatAnswer({ question: 'How much?', localAnswer: 'Spent 100' });
    expect(typeof result).toBe('string');
  });
  it('suggestMerchantCategory returns null or a string', async () => {
    const result = await provider.suggestMerchantCategory('Supermarket');
    expect(result === null || typeof result === 'string').toBe(true);
  });
}

describe('LocalOnlyProvider contract', () => {
  const provider = new LocalOnlyProvider();
  assertProviderContract(provider);

  it('isLocal is true', () => { expect(provider.isLocal).toBe(true); });
  it('type is "local"', () => { expect(provider.type).toBe('local'); });
  it('testConnection always succeeds', async () => {
    const r = await provider.testConnection();
    expect(r.ok).toBe(true);
  });
  it('extractDocument returns null', async () => {
    expect(await provider.extractDocument({ documentText: 'any' })).toBeNull();
  });
  it('enhanceChatAnswer returns localAnswer unchanged', async () => {
    const answer = 'Spent ₪1,530 in March';
    const result = await provider.enhanceChatAnswer({ question: 'How much?', localAnswer: answer });
    expect(result).toBe(answer);
  });
  it('suggestMerchantCategory returns null', async () => {
    expect(await provider.suggestMerchantCategory('Unknown Store')).toBeNull();
  });
});
