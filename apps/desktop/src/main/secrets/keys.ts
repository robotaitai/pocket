/**
 * Canonical keychain account name helpers.
 *
 * All secrets stored by Pocket use a single keychain service name ("pocket")
 * and structured account names defined here. This ensures consistent naming
 * across IPC handlers, tests, and future connectors.
 *
 * Naming convention:
 *   provider:<type>             → AI provider API key (openai, anthropic, gemini)
 *   connector:<id>:<field>      → Scraper credential field for a given institution
 *
 * Examples:
 *   provider:openai             → OpenAI API key
 *   connector:hapoalim:userCode → Hapoalim bank user code
 *   connector:max:password      → Max card password
 *
 * NEVER store the following as secrets:
 *   - Any DB-level identifier (transaction IDs, batch IDs)
 *   - Any normalised financial data
 *   - Environment-level config that belongs in settings (not secrets)
 */

/** The keychain service name used for all Pocket secrets. */
export const POCKET_SERVICE = 'pocket';

/** Account name for a provider API key. */
export function providerKeyAccount(providerType: string): string {
  return `provider:${providerType}`;
}

/** Account name for a connector credential field. */
export function connectorCredentialAccount(connectorId: string, field: string): string {
  return `connector:${connectorId}:${field}`;
}

/**
 * Well-known secret account names, for documentation and test reference.
 * These are NOT exhaustive — any connector may add new credential fields.
 */
export const KNOWN_ACCOUNTS = {
  // Provider API keys
  OPENAI: providerKeyAccount('openai'),
  ANTHROPIC: providerKeyAccount('anthropic'),
  GEMINI: providerKeyAccount('gemini'),
  // Connector credentials (examples — actual fields come from ConnectorDescriptor)
  HAPOALIM_USER_CODE: connectorCredentialAccount('hapoalim', 'userCode'),
  HAPOALIM_PASSWORD: connectorCredentialAccount('hapoalim', 'password'),
  MAX_USERNAME: connectorCredentialAccount('max', 'username'),
  MAX_PASSWORD: connectorCredentialAccount('max', 'password'),
} as const;

/** Returns true if the account name looks like a known structured secret. */
export function isKnownAccountFormat(account: string): boolean {
  return account.startsWith('provider:') || account.startsWith('connector:');
}
