import { describe, it, expect } from 'vitest';
import { createNullSecretStore } from '../src/main/secrets/index.js';

describe('SecretStore (null implementation)', () => {
  it('returns null for an unknown account', async () => {
    const store = createNullSecretStore();
    const val = await store.get('pocket', 'hapoalim');
    expect(val).toBeNull();
  });

  it('stores and retrieves a secret', async () => {
    const store = createNullSecretStore();
    await store.set('pocket', 'hapoalim', 'secret-password');
    const val = await store.get('pocket', 'hapoalim');
    expect(val).toBe('secret-password');
  });

  it('namespaces by service+account', async () => {
    const store = createNullSecretStore();
    await store.set('pocket', 'hapoalim', 'pw-a');
    await store.set('pocket', 'leumi', 'pw-b');
    expect(await store.get('pocket', 'hapoalim')).toBe('pw-a');
    expect(await store.get('pocket', 'leumi')).toBe('pw-b');
  });

  it('deletes a secret', async () => {
    const store = createNullSecretStore();
    await store.set('pocket', 'hapoalim', 'pw');
    await store.delete('pocket', 'hapoalim');
    expect(await store.get('pocket', 'hapoalim')).toBeNull();
  });

  it('each createNullSecretStore call has its own isolated store', async () => {
    const a = createNullSecretStore();
    const b = createNullSecretStore();
    await a.set('svc', 'acc', 'secret');
    expect(await b.get('svc', 'acc')).toBeNull();
  });
});
