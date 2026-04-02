/**
 * SecretStore — abstraction over OS-level credential storage.
 *
 * Production: keytar backed by macOS Keychain / Windows Credential Manager / libsecret.
 * Credentials never touch plaintext config files or environment variables.
 *
 * Tests: createNullSecretStore() returns an in-memory implementation.
 */
export interface SecretStore {
  get(service: string, account: string): Promise<string | null>;
  set(service: string, account: string, secret: string): Promise<void>;
  delete(service: string, account: string): Promise<void>;
}

/**
 * Returns a keytar-backed secret store.
 * keytar is loaded dynamically so that unit tests can run without native bindings.
 */
export async function createSecretStore(): Promise<SecretStore> {
  // keytar is a native Electron module; dynamic import prevents test-environment crashes
  const keytar = await import('keytar');
  return {
    get: (service, account) => keytar.default.getPassword(service, account),
    set: (service, account, secret) => keytar.default.setPassword(service, account, secret),
    delete: async (service, account) => {
      await keytar.default.deletePassword(service, account);
    },
  };
}

/** In-memory implementation for unit tests. Not for production use. */
export function createNullSecretStore(): SecretStore {
  const store = new Map<string, string>();
  return {
    get: async (service, account) => store.get(`${service}:${account}`) ?? null,
    set: async (service, account, secret) => {
      store.set(`${service}:${account}`, secret);
    },
    delete: async (service, account) => {
      store.delete(`${service}:${account}`);
    },
  };
}
