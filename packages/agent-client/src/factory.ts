import type { AgentProvider, ProviderType } from './types.js';
import { LocalOnlyProvider } from './providers/local.js';
import { OpenAIProvider } from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { GeminiProvider } from './providers/gemini.js';

export interface ProviderCredentials {
  providerType: ProviderType;
  apiKey?: string;
  model?: string;
}

/**
 * Create an AgentProvider from credentials.
 * Returns a LocalOnlyProvider if credentials are missing or type is 'local'.
 */
export function createProvider(creds: ProviderCredentials): AgentProvider {
  if (creds.providerType === 'local' || !creds.apiKey) {
    return new LocalOnlyProvider();
  }

  switch (creds.providerType) {
    case 'openai':
      return new OpenAIProvider(creds.apiKey, creds.model);
    case 'anthropic':
      return new AnthropicProvider(creds.apiKey, creds.model);
    case 'gemini':
      return new GeminiProvider(creds.apiKey, creds.model);
    default:
      // Unknown provider type — fall back to local for safety
      return new LocalOnlyProvider();
  }
}

/** Default model for each provider type. */
export const DEFAULT_MODELS: Record<Exclude<ProviderType, 'local'>, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
  gemini: 'gemini-1.5-flash',
};
