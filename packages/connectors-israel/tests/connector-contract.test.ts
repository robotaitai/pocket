import { describe, it, expect } from 'vitest';
import { FixtureConnector } from '../src/adapters/fixture.js';
import type { ConnectorDescriptor } from '../src/connector.js';
import { fixtureBank, fixtureCard } from './fixtures/scraper-accounts.js';

const bankDescriptor: ConnectorDescriptor = {
  id: 'hapoalim',
  name: 'Bank Hapoalim',
  institutionType: 'bank',
  credentialFields: ['userCode', 'password'],
};

const cardDescriptor: ConnectorDescriptor = {
  id: 'max',
  name: 'Max',
  institutionType: 'card',
  credentialFields: ['username', 'password'],
};

const options = { startDate: new Date('2026-03-01') };

describe('Connector contract — FixtureConnector (bank)', () => {
  it('returns success with normalized accounts and transactions', async () => {
    const connector = new FixtureConnector({
      descriptor: bankDescriptor,
      accounts: fixtureBank,
    });

    const result = await connector.run({ userCode: 'u', password: 'p' }, options);

    expect(result.status).toBe('success');
    if (result.status !== 'success') return;

    expect(result.accounts).toHaveLength(1);
    expect(result.transactions).toHaveLength(2);
    expect(result.accounts[0]?.institution).toBe('hapoalim');
    expect(result.accounts[0]?.institutionType).toBe('bank');
  });

  it('all transactions reference a valid account id', async () => {
    const connector = new FixtureConnector({
      descriptor: bankDescriptor,
      accounts: fixtureBank,
    });

    const result = await connector.run({}, options);
    expect(result.status).toBe('success');
    if (result.status !== 'success') return;

    const accountIds = new Set(result.accounts.map((a) => a.id));
    for (const tx of result.transactions) {
      expect(accountIds.has(tx.accountId)).toBe(true);
    }
  });

  it('transaction ids are unique within a run', async () => {
    const connector = new FixtureConnector({
      descriptor: bankDescriptor,
      accounts: fixtureBank,
    });

    const result = await connector.run({}, options);
    expect(result.status).toBe('success');
    if (result.status !== 'success') return;

    const ids = result.transactions.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('two runs with the same fixture produce identical transaction ids (idempotency)', async () => {
    const connector = new FixtureConnector({
      descriptor: bankDescriptor,
      accounts: fixtureBank,
    });

    const r1 = await connector.run({}, options);
    const r2 = await connector.run({}, options);
    expect(r1.status).toBe('success');
    expect(r2.status).toBe('success');
    if (r1.status !== 'success' || r2.status !== 'success') return;

    const ids1 = r1.transactions.map((t) => t.id).sort();
    const ids2 = r2.transactions.map((t) => t.id).sort();
    expect(ids1).toEqual(ids2);
  });
});

describe('Connector contract — FixtureConnector (card)', () => {
  it('returns normalized card transactions with installment data', async () => {
    const connector = new FixtureConnector({
      descriptor: cardDescriptor,
      accounts: fixtureCard,
    });

    const result = await connector.run({ username: 'u', password: 'p' }, options);
    expect(result.status).toBe('success');
    if (result.status !== 'success') return;

    const tx = result.transactions[0];
    expect(tx?.installmentNumber).toBe(1);
    expect(tx?.installmentTotal).toBe(3);
    expect(result.accounts[0]?.institutionType).toBe('card');
  });
});

describe('Connector error handling', () => {
  it('returns auth error on auth failure', async () => {
    const connector = new FixtureConnector({
      descriptor: bankDescriptor,
      fail: { errorKind: 'auth', message: 'Invalid credentials' },
    });

    const result = await connector.run({ userCode: 'wrong', password: 'wrong' }, options);
    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.errorKind).toBe('auth');
    // Credential values must not appear in error messages
    expect(result.message).not.toContain('wrong');
  });

  it('returns network error on network failure', async () => {
    const connector = new FixtureConnector({
      descriptor: bankDescriptor,
      fail: { errorKind: 'network', message: 'Navigation timeout' },
    });

    const result = await connector.run({}, options);
    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.errorKind).toBe('network');
  });
});
