import { describe, it, expect } from 'vitest';
import { createProvider, DEFAULT_MODELS } from '../src/factory.js';
import { LocalOnlyProvider } from '../src/providers/local.js';
import { OpenAIProvider } from '../src/providers/openai.js';
import { AnthropicProvider } from '../src/providers/anthropic.js';
import { GeminiProvider } from '../src/providers/gemini.js';

describe('createProvider', () => {
  it('returns LocalOnlyProvider for type=local', () => {
    const p = createProvider({ providerType: 'local' });
    expect(p).toBeInstanceOf(LocalOnlyProvider);
    expect(p.isLocal).toBe(true);
  });

  it('returns LocalOnlyProvider when apiKey is missing', () => {
    const p = createProvider({ providerType: 'openai', apiKey: undefined });
    expect(p).toBeInstanceOf(LocalOnlyProvider);
  });

  it('returns LocalOnlyProvider when apiKey is empty string', () => {
    const p = createProvider({ providerType: 'openai', apiKey: '' });
    expect(p).toBeInstanceOf(LocalOnlyProvider);
  });

  it('returns OpenAIProvider for type=openai with key', () => {
    const p = createProvider({ providerType: 'openai', apiKey: 'sk-test' });
    expect(p).toBeInstanceOf(OpenAIProvider);
    expect(p.isLocal).toBe(false);
    expect(p.type).toBe('openai');
  });

  it('returns AnthropicProvider for type=anthropic with key', () => {
    const p = createProvider({ providerType: 'anthropic', apiKey: 'sk-ant-test' });
    expect(p).toBeInstanceOf(AnthropicProvider);
    expect(p.type).toBe('anthropic');
  });

  it('returns GeminiProvider for type=gemini with key', () => {
    const p = createProvider({ providerType: 'gemini', apiKey: 'AIza-test' });
    expect(p).toBeInstanceOf(GeminiProvider);
    expect(p.type).toBe('gemini');
  });
});

describe('DEFAULT_MODELS', () => {
  it('has entries for all non-local providers', () => {
    expect(DEFAULT_MODELS.openai).toBeTruthy();
    expect(DEFAULT_MODELS.anthropic).toBeTruthy();
    expect(DEFAULT_MODELS.gemini).toBeTruthy();
  });
});
