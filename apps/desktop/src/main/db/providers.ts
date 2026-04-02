import type Database from 'better-sqlite3';
import type { ProviderConfig, ProviderType, AgentMode } from '@pocket/agent-client';
import { DEFAULT_PROVIDER_CONFIG } from '@pocket/agent-client';

const MODE_KEY = 'agentMode';
const PROVIDER_TYPE_KEY = 'agentProviderType';
const CHAT_ENHANCE_KEY = 'agentChatEnhancement';
const MERCHANT_SUGGEST_KEY = 'agentMerchantSuggestions';

/** Read the current provider config from settings. Non-secret fields only. */
export function getProviderConfig(db: Database.Database): ProviderConfig {
  const get = (key: string) => (db.prepare<[string], { value: string }>('SELECT value FROM settings WHERE key = ?').get(key))?.value;

  const mode = (get(MODE_KEY) ?? 'local') as AgentMode;
  const providerType = (get(PROVIDER_TYPE_KEY) ?? 'local') as ProviderType;
  const chatEnhancementEnabled = get(CHAT_ENHANCE_KEY) !== 'false';
  const merchantSuggestionsEnabled = get(MERCHANT_SUGGEST_KEY) !== 'false';

  return { mode, providerType, chatEnhancementEnabled, merchantSuggestionsEnabled };
}

/** Persist mode and provider preference (not the key itself). */
export function setProviderConfig(db: Database.Database, config: Partial<ProviderConfig>): void {
  const upsert = (key: string, value: string) => db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);

  if (config.mode !== undefined) upsert(MODE_KEY, config.mode);
  if (config.providerType !== undefined) upsert(PROVIDER_TYPE_KEY, config.providerType);
  if (config.chatEnhancementEnabled !== undefined) upsert(CHAT_ENHANCE_KEY, String(config.chatEnhancementEnabled));
  if (config.merchantSuggestionsEnabled !== undefined) upsert(MERCHANT_SUGGEST_KEY, String(config.merchantSuggestionsEnabled));
}

/** Key name in the system keychain for a given provider type. */
export function providerKeychainAccount(providerType: ProviderType): string {
  return `provider:${providerType}`;
}

/** Returns the defaults for callers that need a full ProviderConfig. */
export { DEFAULT_PROVIDER_CONFIG };
